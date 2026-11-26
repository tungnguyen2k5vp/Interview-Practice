import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { checked, isolated, restrictions, label } from './docker.mjs'
import { equalTable, exercises, grade } from './grader.mjs'
import { configuration, openWorker } from './service.mjs'

const real = process.argv.includes('--attest')
const sandbox = mkdtempSync(join(tmpdir(),'interview-runner-check-'))
const csKey='overlapping-bookings@1@1', sqlKey='unbilled-work@1@1'
const cs=exercises.get(csKey), sql=exercises.get(sqlKey)
const tests={ [csKey]:[{input:'100, 160, 130, 190',output:'true'}],
  [sqlKey]:[{dataset:'INSERT #Shifts VALUES (42,1),(43,1),(44,0); INSERT #Bills VALUES (1,43,0),(2,NULL,0);'}] }
const state=real?process.env.IP_WORKER_STATE:sandbox
let cfg
if(real) cfg=await configuration(process.env)
else {
  const inspect=tag=>checked(['image','inspect','--format','{{.Id}}',tag])
  cfg={state:sandbox,token:randomUUID(),kinds:['coding','sql'],privateCases:tests,
    sdk:await inspect('mcr.microsoft.com/dotnet/sdk:10.0'),sql:await inspect('mcr.microsoft.com/mssql/server:2022-latest'),
    reader:await inspect('interview-practice-sql-reader:1')}
}
const instance='qa-'+randomUUID()
let passed=0
async function check(name,fn){await fn();passed++;console.log('PASS '+name)}
if(process.argv.includes('--catalog')){
  const privateCases=JSON.parse(readFileSync(process.env.IP_WORKER_TESTS,'utf8'))
  for(const [key,e] of exercises) {
    const gradeCode=code=>grade({...cfg,instance,privateCases},{...e,action:'submit',code,input:null},AbortSignal.timeout(150000))
    const row=await gradeCode(e.solution)
    assert.equal(row.status,'accepted',key+' '+JSON.stringify(row))
    console.log('PASS reference solution and private pack '+key)
    if(e.tags.includes('debug-lab')){
      assert.equal((await gradeCode(e.starter)).status,'wrong_answer',key+' buggy starter')
      console.log('PASS starter reproduces the reported failure '+key)
    }
  }
}
for(const [kind,image] of [['coding',cfg.sdk],['sql',cfg.sql]].filter(([k])=>cfg.kinds.includes(k))) {
  await check(kind+' container policy enforced by Docker',()=>isolated(image,{flags:restrictions(instance,kind==='sql'),command:[]},async name=>{
    const [c]=JSON.parse(await checked(['inspect',name]))
    const h=c.HostConfig
    assert.equal(h.NetworkMode,'none');assert.equal(h.ReadonlyRootfs,true);assert.equal(h.Privileged,false)
    assert(!h.Binds?.length && !Object.keys(h.PortBindings??{}).length && !c.Mounts.some(m=>m.Type==='bind'))
    assert(h.CapDrop.includes('ALL') && h.SecurityOpt.includes('no-new-privileges=true'))
    assert.equal(c.Config.User.split(':')[0],kind==='sql'?'10001':'1654')
    assert(h.Memory>0 && h.MemorySwap===h.Memory && h.PidsLimit>0 && h.NanoCpus>0)
    assert(h.Ulimits.some(l=>l.Name==='fsize' && l.Hard>0))
  }))
}
const run=(e,action,code,input)=>grade({...cfg,instance,privateCases:tests},{...e,action,code,input},new AbortController().signal)
if(cfg.kinds.includes('coding')){
  await check('C# custom input, public and held-out cases, wrong answer',async()=>{
    const output=await run(cs,'run',cs.solution,'4, 7, 7, 8')
    assert.equal(output.status,'completed');assert.equal(output.output,'false')
    const accepted=await run(cs,'submit',cs.solution);assert.equal(accepted.status,'accepted');assert.equal(accepted.total,6)
    const wrong=await run(cs,'submit',cs.solution.replace(' < ',' > '));assert.equal(wrong.status,'wrong_answer');assert(!('output' in wrong))
  })
  await check('compiler, runtime, memory, time and output limits',async()=>{
    for(const [body,status] of [['this does not compile','compile_error'],['throw new InvalidOperationException();','runtime_error'],
      ['var buffer=new byte[500_000_000]; for(int p=0;p<buffer.Length;p+=4096)buffer[p]=1; GC.KeepAlive(buffer); return false;','memory_limit'],
      ['System.Threading.Thread.Sleep(20000); return false;','timeout'],['Console.Write(new string(\'a\', 70000)); return false;','output_limit']]){
      const r=await run(cs,'run',cs.starter.replace('throw new NotImplementedException();',body),'1,2,3,4')
      assert.equal(r.status,status)
    }
  })
  await check('HTTP ownership, idempotency, cancellation, restart and persisted history',async()=>{
    const config={...cfg,state:sandbox,privateCases:tests}, token=config.token
    async function start(){
      const app=await openWorker(config)
      const host=createServer(app.handle)
      await new Promise(ok=>host.listen(0,'127.0.0.1',ok))
      const url='http://127.0.0.1:'+host.address().port
      return {call:(path,method='GET',body,auth=token)=>fetch(url+path,{method,body:body&&JSON.stringify(body),
        headers:{authorization:'Bearer '+auth,'content-type':'application/json'}}),
        stop:async()=>{await new Promise(ok=>host.close(ok));await app.close()}}
    }
    let api=await start()
    try {
      assert.equal((await api.call('/v1/capabilities','GET',undefined,'invalid')).status,401)
      const id=randomUUID(), next=randomUUID(), base='/v1/owners/first/jobs/', path=base+id
      const body={slug:cs.slug,version:1,testVersion:1,kind:'coding',action:'run',code:cs.solution,input:'1,8,2,6'}
      assert.equal((await api.call(path,'PUT',body)).status,201)
      assert.equal((await api.call(path,'PUT',body)).status,200)
      assert.equal((await api.call(path,'PUT',{...body,input:'0,2,1,3'})).status,409)
      assert.equal((await api.call('/v1/owners/second/jobs/'+id)).status,404)
      assert.equal((await api.call(base+next,'PUT',body)).status,201)
      assert.equal((await (await api.call(base+next,'DELETE')).json()).status,'cancelled')
      await api.stop()
      const snapshot=new DatabaseSync(join(sandbox,'jobs.sqlite'))
      const instanceId=snapshot.prepare('SELECT instance FROM settings').get().instance
      snapshot.close()
      const orphan=await checked(['create','--label',label+'='+instanceId,'--network','none',cfg.sdk,'/bin/true'])
      api=await start()
      assert.equal(await checked(['ps','-aq','--filter','id='+orphan]),'')
      let status
      for(let i=0;i<60;i++) {
        status=(await (await api.call(path)).json()).status
        if(!['queued','running'].includes(status))break
        await delay(300)
      }
      assert.equal(status,'completed')
      assert.equal((await (await api.call(base.slice(0,-1)+'?slug='+cs.slug+'&version=1')).json()).total,2)
      for(let i=0;i<8;i++){
        const extra=base+randomUUID()
        assert.equal((await api.call(extra,'PUT',body)).status,201)
        await api.call(extra,'DELETE')
      }
      assert.equal((await api.call(base+randomUUID(),'PUT',body)).status,429)
    }finally{await api.stop()}
  })
}
if(cfg.kinds.includes('sql')) {
  await check('SQL run on a new instance, scoped login, NULL, duplicate rows and typed comparison',async()=>{
    const result=await run(sql,'run',"SELECT v FROM (VALUES (CAST(NULL AS int)),(1),(1)) d(v) ORDER BY v;")
    assert.deepEqual(result.rows,[[null],['1'],['1']])
    const rights=await run(sql,'run',"SELECT IS_SRVROLEMEMBER('sysadmin') AS is_admin, DB_NAME() AS db_name;")
    assert.equal(rights.status,'completed',rights.output);assert.deepEqual(rights.rows,[['0','tempdb']])
    const a={columns:['v'],types:['int'],rows:[['1'],[null],['1']]}, b={...a,rows:[[null],['1'],['1']]}
    assert(equalTable(a,b,false) && !equalTable(a,b,true) && !equalTable(a,{...a,types:['bigint']},false))
    assert(!equalTable(a,{...a,rows:[['1'],[null]]},false))
  })
  await check('SQL public and private datasets, alternate query, aggregate-only hidden verdict',async()=>{
    const alternative="SELECT s.id AS shift_id FROM #Shifts s LEFT JOIN #Bills b ON s.id=b.shift_id AND b.voided=0 WHERE s.approved=1 AND b.id IS NULL ORDER BY s.id;"
    const result=await run(sql,'submit',alternative)
    assert.equal(result.status,'accepted');assert.equal(result.total,2);assert(!('rows' in result))
  })
}
assert.equal(await checked(['ps','-aq','--filter','label='+label+'='+instance]),'')
if(real){
  mkdirSync(state,{recursive:true})
  writeFileSync(join(state,'isolation.json'),JSON.stringify({sdk:cfg.sdk,sql:cfg.sql,reader:cfg.reader,checkedAt:new Date().toISOString(),groups:passed}))
}
console.log('PASS cleanup; '+passed+' groups')
