import { readFileSync, readdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { checked, docker, isolated, restrictions, Verdict } from './docker.mjs'

const content = new URL('../server/Content/',import.meta.url)
const read = file => JSON.parse(readFileSync(file,'utf8'))
const compile = readFileSync(new URL('./compile.sh',import.meta.url),'utf8').replaceAll('\r\n','\n')
const entries = readdirSync(content).filter(f => /^exercises(?:-batch-[\w-]+)?\.json$/.test(f)).flatMap(f=>read(new URL(f,content)))
if (process.env.IP_WORKER_CATALOG) entries.push(...read(process.env.IP_WORKER_CATALOG))
export const exercises = new Map(entries.map(e=>[[e.slug,e.version,e.testVersion].join('@'),e]))
if(exercises.size!==entries.length)throw new Error('Duplicate exercise release')
export const keyOf = r => [r.slug,r.version,r.testVersion].join('@')

export function inputArgs(text) {
  // The editor uses the method argument list, for example [1,2], 5.
  return JSON.parse('['+text+']')
}

function program(e, code) {
  const sig = e.starter.match(/public static [\w[\]]+ (\w+)\(([^)]*)\)/)
  if (!sig) throw new Error('Unknown signature for '+e.slug)
  const args = sig[2].split(',').map((param,i)=>'args['+i+'].Deserialize<'+param.trim().split(' ')[0]+'>()!')
  return 'using System; using System.Collections.Generic; using System.Linq; using System.Threading; using System.Threading.Tasks; using System.Text.Json;\n'+
    'public class Candidate {\n'+code+'\n}\npublic class Entry { public static void Main() { try { '+
    'var args=JsonSerializer.Deserialize<JsonElement[]>(Console.In.ReadToEnd())!; '+
    'Console.Write(JsonSerializer.Serialize(Candidate.'+sig[1]+'('+args.join(',')+'))); } catch (OutOfMemoryException) { Environment.Exit(87); } } }'
}

async function runCsharp(cfg, e, code, args, signal) {
  const encoded = [program(e,code),JSON.stringify(args)].map(s=>Buffer.from(s).toString('base64')).join('\n')+'\n'
  const flags = [...restrictions(cfg.instance),'-i','-e','HOME=/tmp','-e','DOTNET_PROCESSOR_COUNT=1','-e','DOTNET_EnableDiagnostics=0','-e','DOTNET_CLI_TELEMETRY_OPTOUT=1']
  if(e.topic==='aspnet') flags.push('-e','IP_ASPNET=1')
  return isolated(cfg.sdk,{flags,command:['/bin/sh','-c',compile]},async name=>{
    const r = await docker(['start','-ai',name],{input:encoded,signal,timeout:12000})
    if (r.code===87 || await checked(['inspect','--format','{{.State.OOMKilled}}',name]) === 'true') throw new Verdict('memory_limit')
    if (r.code === 65) throw new Verdict('compile_error',(r.stdout+r.stderr).slice(0,4000))
    if (r.code !== 0) throw new Verdict('runtime_error',r.stderr.slice(0,4000))
    return r.stdout
  })
}

export function equalTable(a,b,ordered) {
  if (!isDeepStrictEqual(a.columns,b.columns) || !isDeepStrictEqual(a.types,b.types)) return false
  const rows = t => t.rows.map(r=>JSON.stringify(r))
  return ordered ? isDeepStrictEqual(a.rows,b.rows) : isDeepStrictEqual(rows(a).sort(),rows(b).sort())
}

async function runSql(cfg,e,query,setup,signal) {
  const password = randomBytes(24).toString('hex')+'Az2!'
  const flags = [...restrictions(cfg.instance,true),'--tmpfs','/var/opt/mssql:rw,nosuid,nodev,size=1300m,uid=10001,gid=0',
    '-e','ACCEPT_EULA=Y','-e','MSSQL_PID=Developer','-e','MSSQL_MEMORY_LIMIT_MB=2048','-e','MSSQL_SA_PASSWORD']
  return isolated(cfg.sql,{flags,env:{MSSQL_SA_PASSWORD:password},command:[]},async name=>{
    await checked(['start',name])
    signal.throwIfAborted()
    // Only the trusted client joins the database's otherwise networkless namespace.
    const helperFlags = restrictions(cfg.instance)
    helperFlags[helperFlags.indexOf('none')] = 'container:'+name
    return isolated(cfg.reader,{flags:[...helperFlags,'-i','-e','DOTNET_EnableDiagnostics=0'],command:[]},async helper=>{
      const req={password,schema:e.schema,dataset:setup,query}
      const result=await docker(['start','-ai',helper],{input:JSON.stringify(req),signal,timeout:55000,limit:245760})
      if (await checked(['inspect','--format','{{.State.OOMKilled}}',name]) === 'true') throw new Verdict('memory_limit')
      if (result.code!==0) throw new Error('SQL client or instance unavailable')
      const data=JSON.parse(result.stdout)
      if (data.error) throw new Verdict(data.error,data.message)
      return data
    })
  })
}

export async function grade(cfg,r,signal) {
  const started=Date.now(), e=exercises.get(keyOf(r))
  const submit=r.action==='submit'
  const privateCases=cfg.privateCases[keyOf(r)]
  if (submit && !privateCases?.length) throw new Error('Missing private tests')
  let passed=0
  try {
    if (e.kind==='coding') {
      const cases=submit ? [...e.examples,...e.tests,...privateCases] : r.input?.trim() ? [{input:r.input}] : e.examples
      const outputs=[]
      for (const c of cases) {
        signal.throwIfAborted()
        const output=await runCsharp(cfg,e,r.code,inputArgs(c.input),signal)
        if (!submit) outputs.push(output)
        let match=false
        if (c.output !== undefined) { try { match=isDeepStrictEqual(JSON.parse(output),JSON.parse(c.output)) } catch {} }
        if (match) passed++
      }
      const output=outputs.join('\n')
      if (Buffer.byteLength(output)>65536) throw new Verdict('output_limit')
      return {status:submit ? passed===cases.length?'accepted':'wrong_answer' : 'completed',
        passed:cases.some(c=>c.output!==undefined)?passed:null,total:cases.some(c=>c.output!==undefined)?cases.length:null,
        milliseconds:Date.now()-started,...(!submit&&{output})}
    }
    const datasets=submit ? [e.dataset,...privateCases.map(c=>c.dataset)] : [r.input?.trim() || e.dataset]
    for (const dataset of datasets) {
      signal.throwIfAborted()
      const table=await runSql(cfg,e,r.code,dataset,signal)
      if (!submit) return {status:'completed',columns:table.columns,rows:table.rows,milliseconds:Date.now()-started}
      // A separate clean instance runs the trusted reference. It never shares a session or disk with a submission.
      const expected=await runSql(cfg,e,e.solution,dataset,signal)
      if (equalTable(table,expected,Boolean(e.ordered))) passed++
    }
    return {status:passed===datasets.length?'accepted':'wrong_answer',passed,total:datasets.length,milliseconds:Date.now()-started}
  } catch(error) {
    if (signal.aborted) return {status:'cancelled'}
    if (!(error instanceof Verdict)) throw error
    return {status:error.status,milliseconds:Date.now()-started,...(!submit&&{output:error.message.slice(0,4000)})}
  }
}
