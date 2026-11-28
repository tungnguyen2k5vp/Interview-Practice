import assert from 'node:assert/strict'
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {chromium} from 'playwright'

const root=resolve(import.meta.dirname,'../..')
const baseURL=process.env.IP_BASE
assert(baseURL && ['127.0.0.1','localhost'].includes(new URL(baseURL).hostname),'Use an isolated local QA instance')
assert(/^InterviewPractice_V4_Batch_QA_[a-f0-9]+$/.test(process.env.IP_QA_DB??''),'Use a fresh dedicated V4 import database')
const files=process.argv.slice(2).flatMap(dir=>readdirSync(resolve(root,dir)).filter(f=>/^questions-batch-(20|21|22|23|24|25)-.*\.json$/.test(f)).map(f=>join(root,dir,f))).sort()
assert(files.length,'Provide draft directories')
const browser=await chromium.launch({channel:process.env.IP_BROWSER || 'chrome'})
const admin=await browser.newContext({baseURL})
const learner=await browser.newContext({baseURL})
const password=randomUUID()+'Qa'
async function send(context,path,method='GET',body,statuses=[200]){
  const headers=method==='GET'?{}:{'X-CSRF-Token':(await (await context.request.get('/api/auth/csrf')).json()).token}
  const response=await context.request.fetch('/api'+path,{method,data:body,headers})
  assert(statuses.includes(response.status()),path+' '+response.status()+' '+await response.text())
  return response.status()===204?null:response.json()
}
const artifacts=join(root,'.impeccable','review')
mkdirSync(artifacts,{recursive:true})
try{
  await send(admin,'/auth/login','POST',{email:process.env.IP_ADMIN_EMAIL,password:process.env.IP_ADMIN_PASSWORD})
  await send(learner,'/auth/register','POST',{email:randomUUID()+'@example.test',password,displayName:'V4 batch QA'},[200,201])
  const original=JSON.parse(readFileSync(join(root,'server/Content/questions-batch-02.json'),'utf8')).find(q=>q.slug==='integer-division')
  const attempt=await send(learner,'/practice/questions/integer-division/submit','POST',{
    cursor:{id:randomUUID(),revision:0,version:1},choice:original.content.quiz.correctIndex,language:'vi',activeSeconds:0
  },[201])
  const before=await send(learner,'/questions/integer-division')
  const initial=(await send(learner,'/questions')).total
  let published=0
  for(const file of files){
    const rows=JSON.parse(readFileSync(file,'utf8'))
    assert(rows.length>=30 && rows.length<=50,file+' batch size')
    for(let i=0;i<rows.length;i+=20){
      const part=rows.slice(i,i+20)
      await send(learner,'/admin/questions/import','POST',part,[403])
      assert.deepEqual(await send(admin,'/admin/questions/import','POST',part),{imported:part.length,unchanged:0})
      assert.deepEqual(await send(admin,'/admin/questions/import','POST',part),{imported:0,unchanged:part.length})
      await send(learner,'/questions/'+part[0].slug,'GET',undefined,[404])
    }
    for(const row of rows){
      const path='/admin/questions/'+row.slug
      let state=await send(admin,path)
      await send(admin,path+'/publication','POST',{revision:state.revision,status:'published'},[400])
      for(const status of ['needs-review','verified','published'])
        state=await send(admin,path+'/publication','POST',{revision:state.revision,status})
      const visible=await send(learner,'/questions/'+row.slug)
      assert.equal(visible.prompt,row.content.prompt)
      assert.equal(visible.englishPrompt,row.content.englishPrompt)
      assert.equal(visible.card.version,1)
      assert(!JSON.stringify(visible).includes('correctIndex'))
    }
    const page=await learner.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    try{
      for(const width of [1440,390]){
        await page.setViewportSize({width,height:width===390?844:960})
        for(const theme of ['light','dark']){
          await page.goto('/cau-hoi/'+rows[0].slug)
          await page.getByRole('heading',{name:rows[0].content.title,exact:true}).waitFor()
          const toggle=page.getByRole('button',{name:theme==='light'?'Dùng giao diện sáng':'Dùng giao diện tối',exact:true})
          if(await toggle.count())await toggle.click()
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
          await page.screenshot({path:join(artifacts,file.split(/[\\/]/).pop().replace('.json','')+'-'+width+'-'+theme+'.png')})
        }
      }
      assert.deepEqual(errors,[])
    }finally{await page.close()}
    published+=rows.length
    assert.equal((await send(learner,'/questions')).total,initial+published)
    console.log('PASS import, retry, publication, privacy and desktop/mobile '+file.split(/[\\/]/).pop()+' '+rows.length)
  }
  assert.deepEqual(await send(learner,'/questions/integer-division'),before)
  assert.equal((await send(learner,'/practice/attempts/'+attempt.id)).id,attempt.id)
  console.log('PASS existing answer, rubric version and progress survive '+published+' published questions')
  async function measure(size){
    const result={}
    for(const query of ['', '?search=DI','?search=trang%20truoc','?page=80']){
      const times=[]
      let bytes=0
      for(let i=0;i<31;i++){
        const started=performance.now()
        const response=await learner.request.get('/api/questions'+query)
        assert.equal(response.status(),200)
        const text=await response.text(),data=JSON.parse(text)
        assert(data.items.length<=9)
        if(!query)assert.equal(data.total,size)
        if(i)times.push(performance.now()-started)
        bytes=Math.max(bytes,Buffer.byteLength(text))
      }
      times.sort((a,b)=>a-b)
      result[query||'all']={p50:times[14],p95:times[28],maxBytes:bytes}
    }
    return result
  }
  const scale={questions500:await measure(500)}
  const sql=query=>execFileSync('sqlcmd',['-S','localhost','-E','-C','-b','-d',process.env.IP_QA_DB,'-Q',query],{stdio:'pipe'})
  try {
    sql(`
      SET XACT_ABORT ON; BEGIN TRAN;
      SELECT TOP(500) ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) AS n INTO #Scale FROM sys.all_objects;
      INSERT Questions (Slug,Latest,Published,Revision,Status)
      SELECT CONCAT('scale-qa-',n),1,1,1,'published' FROM #Scale;
      INSERT QuestionVersions (Slug,Version,Title,Topic,Format,Difficulty,Level,Technology,Minutes,SearchText,Data)
      SELECT CONCAT('scale-qa-',s.n),1,CONCAT('QA scale fixture ',s.n),q.Topic,q.Format,q.Difficulty,q.Level,q.Technology,q.Minutes,
        CONCAT('QA scale fixture ',s.n),JSON_MODIFY(JSON_MODIFY(q.Data,'$.title',CONCAT('QA scale fixture ',s.n)),'$.prompt','QA scale fixture')
      FROM #Scale s CROSS JOIN QuestionVersions q WHERE q.Slug='integer-division' AND q.Version=1;
      COMMIT;
    `)
    scale.questions1000=await measure(1000)
  } finally {
    sql("SET XACT_ABORT ON; BEGIN TRAN; DELETE FROM QuestionVersions WHERE Slug LIKE 'scale-qa-%'; DELETE FROM Questions WHERE Slug LIKE 'scale-qa-%'; COMMIT;")
  }
  writeFileSync(join(root,'.artifacts/v4-search-performance.json'),JSON.stringify(scale,null,2)+'\n')
  console.log('PASS search and bounded pages at 500 real records and 1000 QA records; scale fixtures removed')
}finally{
  try{await send(learner,'/profile/account/delete','POST',{password},[204])}finally{
    await admin.close();await learner.close();await browser.close()
  }
}
