import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'node:https'
import { checked, recover } from './docker.mjs'
import { exercises, grade, inputArgs, keyOf } from './grader.mjs'

const digest = value => createHash('sha256').update(value).digest()
const idShape=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i
const error = status => Object.assign(new Error('Request rejected'),{status})
async function readBody(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??'')) throw error(415)
  const chunks=[]
  let bytes=0
  for await (const c of req) {
    if ((bytes+=c.length)>160000) throw error(413)
    chunks.push(c)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw error(400) }
}

export async function openWorker(config) {
  mkdirSync(config.state,{recursive:true,mode:0o700})
  // SQLite releases this process lock on a crash. A second controller must never sweep a live job.
  const lease=new DatabaseSync(join(config.state,'controller.lock'))
  lease.exec('BEGIN EXCLUSIVE; CREATE TABLE IF NOT EXISTS lease (id INTEGER PRIMARY KEY)')
  const db=new DatabaseSync(join(config.state,'jobs.sqlite'))
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS settings(instance TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,owner TEXT NOT NULL,slug TEXT NOT NULL,version INTEGER NOT NULL,
      action TEXT NOT NULL,at TEXT NOT NULL,hash TEXT NOT NULL,status TEXT NOT NULL,payload TEXT,result TEXT);
    CREATE INDEX IF NOT EXISTS owner_jobs ON jobs(owner,slug,version,at);
    CREATE INDEX IF NOT EXISTS job_queue ON jobs(status,at);`)
  const instance=db.prepare('SELECT instance FROM settings').get()?.instance ?? randomUUID()
  if (!db.prepare('SELECT 1 FROM settings').get()) db.prepare('INSERT INTO settings VALUES (?)').run(instance)
  config={...config,instance}
  await recover(instance)
  db.exec("UPDATE jobs SET status='queued' WHERE status='running'")
  const secret=digest('Bearer '+config.token)
  let stopping=false, active=null, drainPromise=null
  const owned=(owner,id)=>db.prepare('SELECT * FROM jobs WHERE owner=? AND id=?').get(owner,id)
  const view=j=>({id:j.id,slug:j.slug,version:j.version,action:j.action,at:j.at,status:j.status,...JSON.parse(j.result??'{}')})
  function schedule() {
    if (drainPromise || stopping) return
    drainPromise=drain().finally(()=>{drainPromise=null})
  }
  async function drain() {
    while (!stopping) {
      const job=db.prepare("SELECT * FROM jobs WHERE status='queued' ORDER BY at,id LIMIT 1").get()
      if (!job) return
      active={id:job.id,controller:new AbortController()}
      db.prepare("UPDATE jobs SET status='running' WHERE id=?").run(job.id)
      let result
      const deadline=AbortSignal.timeout(150000)
      try { result=await grade(config,JSON.parse(job.payload),AbortSignal.any([deadline,active.controller.signal])) }
      catch { result={status:active.controller.signal.aborted?'cancelled':'failed'} }
      if(deadline.aborted) result={status:'timeout'}
      if (!stopping) db.prepare("UPDATE jobs SET status=?,result=?,payload=NULL WHERE id=? AND status='running'")
        .run(result.status,JSON.stringify(result),job.id)
      active=null
    }
  }
  setImmediate(schedule)
  async function handle(req,res) {
    function send(status,data) {
      res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'})
      res.end(JSON.stringify(data))
    }
    try {
      if (!timingSafeEqual(secret,digest(req.headers.authorization??''))) throw error(401)
      const url=new URL(req.url,'https://localhost')
      if (req.method==='GET' && url.pathname==='/v1/capabilities') {
        const enabled=[...exercises].filter(([,e])=>config.kinds.includes(e.kind)).map(([key,e])=>e.kind+':'+key)
        return send(200,{protocol:1,isolated:true,kinds:config.kinds,exercises:enabled})
      }
      const route=/^\/v1\/owners\/([A-Za-z0-9_-]{1,128})\/jobs(?:\/([a-f\d-]+))?$/i.exec(url.pathname)
      if (!route) throw error(404)
      const [,owner,rawId]=route, id=rawId?.toLowerCase()
      if (id && !idShape.test(id)) throw error(400)
      if (!id && req.method==='GET') {
        const slug=url.searchParams.get('slug'), version=Number(url.searchParams.get('version')), page=Number(url.searchParams.get('page')??1)
        if (!slug || !Number.isSafeInteger(version) || version<1 || !Number.isSafeInteger(page) || page<1 || page>100000) throw error(400)
        const filter=[owner,slug,version]
        const total=db.prepare('SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND slug=? AND version=?').get(...filter).n
        const items=db.prepare('SELECT * FROM jobs WHERE owner=? AND slug=? AND version=? ORDER BY at DESC,id DESC LIMIT 10 OFFSET ?')
          .all(...filter,(page-1)*10).map(view)
        return send(200,{items,total})
      }
      if (!id) throw error(404)
      if (req.method==='PUT') {
        const r=await readBody(req)
        const e=r && exercises.get(keyOf(r))
        if (!e || r.version!==e.version || r.testVersion!==e.testVersion || e.kind!==r.kind || !['run','submit'].includes(r.action) ||
          typeof r.code!=='string' || !r.code.trim() || r.code.length>32000 || r.input!=null && (typeof r.input!=='string' || r.input.length>8000 || r.action==='submit'))
          throw error(400)
        if (!config.kinds.includes(e.kind)) throw error(503)
        if (e.kind==='coding' && r.input?.trim()) {try {inputArgs(r.input)}catch{throw error(400)}}
        const payload=JSON.stringify({slug:e.slug,version:e.version,testVersion:e.testVersion,kind:e.kind,action:r.action,code:r.code,input:r.input??null})
        const hash=digest(payload).toString('hex'), old=owned(owner,id)
        if (old) {if (old.hash!==hash) throw error(409); return send(200,view(old))}
        if (db.prepare('SELECT id FROM jobs WHERE id=?').get(id)) throw error(409)
        const since=new Date(Date.now()-60000).toISOString()
        if (db.prepare('SELECT COUNT(*) n FROM jobs WHERE owner=? AND at>=?').get(owner,since).n>=10 ||
          db.prepare("SELECT COUNT(*) n FROM jobs WHERE status IN ('queued','running')").get().n>=32) throw error(429)
        db.prepare("INSERT INTO jobs(id,owner,slug,version,action,at,hash,status,payload) VALUES(?,?,?,?,?,?,?,'queued',?)")
          .run(id,owner,e.slug,e.version,r.action,new Date().toISOString(),hash,payload)
        const created=view(owned(owner,id))
        setImmediate(schedule)
        return send(201,created)
      }
      const job=owned(owner,id)
      if (!job) throw error(404)
      if (req.method==='DELETE' && ['running','queued'].includes(job.status)) {
        db.prepare("UPDATE jobs SET status='cancelled',payload=NULL WHERE id=?").run(id)
        if (active?.id===id) active.controller.abort()
      } else if (req.method!=='GET' && req.method!=='DELETE') throw error(405)
      send(200,view(owned(owner,id)))
    } catch(e) { send(Number.isInteger(e.status)?e.status:500,{error:'request_failed'}) }
  }
  return {handle,async close(){
    stopping=true
    active?.controller.abort()
    await drainPromise
    db.close();lease.close()
  }}
}

export async function configuration(env) {
  if ((env.IP_WORKER_TOKEN??'').length<32 || !env.IP_WORKER_STATE || !env.IP_WORKER_TESTS) throw new Error('Set a private token, state directory and test pack.')
  const state=resolve(env.IP_WORKER_STATE), privateCases=JSON.parse(readFileSync(env.IP_WORKER_TESTS,'utf8'))
  const kinds=(env.IP_WORKER_KINDS??'coding,sql').split(',')
  if (!kinds.length || kinds.some(k=>!['coding','sql'].includes(k))) throw new Error('Invalid worker kinds')
  const cfg={state,token:env.IP_WORKER_TOKEN,privateCases,kinds}
  const inspect=tag=>checked(['image','inspect','--format','{{.Id}}',tag])
  const security=await checked(['info','--format','{{.OSType}} {{json .SecurityOptions}}'])
  if (!security.startsWith('linux ') || !security.includes('seccomp')) throw new Error('Linux engine with seccomp required')
  if (kinds.includes('coding')) cfg.sdk=await inspect(env.IP_WORKER_SDK??'mcr.microsoft.com/dotnet/sdk:10.0')
  if (kinds.includes('sql')) {
    cfg.sql=await inspect(env.IP_WORKER_SQL??'mcr.microsoft.com/mssql/server:2022-latest')
    cfg.reader=await inspect(env.IP_WORKER_READER??'interview-practice-sql-reader:1')
  }
  for(const [key,e] of exercises) if(kinds.includes(e.kind)) {
    const cases=privateCases[key]
    if(!Array.isArray(cases) || !cases.length || cases.length>12 || cases.some(c=>e.kind==='coding'
      ? typeof c?.input!=='string' || typeof c?.output!=='string'
      : typeof c?.dataset!=='string' || !c.dataset.trim())) throw new Error('Invalid private cases for '+key)
  }
  return cfg
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const cfg=await configuration(process.env)
  const proof=JSON.parse(readFileSync(join(cfg.state,'isolation.json'),'utf8'))
  if(cfg.kinds.some(k=>k==='sql' ? proof.sql!==cfg.sql || proof.reader!==cfg.reader : proof.sdk!==cfg.sdk))
    throw new Error('Run the isolation checks for the installed image IDs first.')
  const tls={cert:readFileSync(process.env.IP_WORKER_CERT),key:readFileSync(process.env.IP_WORKER_KEY),minVersion:'TLSv1.2'}
  const app=await openWorker(cfg)
  const server=createServer({...tls,requestTimeout:15000,headersTimeout:10000,maxHeaderSize:8192},app.handle)
  server.maxConnections=64
  server.listen(Number(process.env.IP_WORKER_PORT??5099),'127.0.0.1')
  const stop=()=>{server.close();app.close().catch(()=>{process.exitCode=1})}
  process.once('SIGTERM',stop);process.once('SIGINT',stop)
}
