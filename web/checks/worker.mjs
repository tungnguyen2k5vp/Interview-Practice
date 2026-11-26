import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { exercises } from '../../worker/grader.mjs'

const baseURL='http://127.0.0.1:5098'
const browser=await chromium.launch({channel:'chrome'})
const ctx=await browser.newContext({baseURL})
const password=randomUUID()+'Qa'
async function api(path,method='GET',data) {
  const csrf=method==='GET'?{}:{'X-CSRF-Token':(await (await ctx.request.get('/api/auth/csrf')).json()).token}
  const res=await ctx.request.fetch('/api'+path,{method,data,headers:csrf})
  assert(res.ok(),path+' '+res.status()+' '+await res.text())
  return res.status()===204?null:res.json()
}
try {
  await api('/auth/register','POST',{displayName:'Worker QA',email:randomUUID()+'@example.test',password})
  const e=exercises.get('overlapping-bookings@1@1')
  const placement=await api('/placement','POST',{id:randomUUID(),level:'intern'})
  assert.equal(placement.coding.slug,e.slug)
  assert.equal((await api('/exercises/'+e.slug)).runnerAvailable,true)
  await api('/exercises/'+e.slug+'/1/draft','PUT',{revision:0,text:e.solution})
  const page=await ctx.newPage()
  for (const item of placement.items) {
    await api('/practice/questions/'+item.slug+'/submit','POST',{cursor:{id:randomUUID(),revision:0,version:item.version},language:'vi',skip:true,activeSeconds:0,studySessionId:placement.id})
  }
  await page.goto('/phien-hoc/'+placement.id)
  await page.getByRole('link',{name:'Mở bài code đầu vào'}).click()
  await page.getByRole('button',{name:'Submit',exact:true}).click()
  await page.getByText('Đạt',{exact:true}).waitFor({timeout:60000})
  const shots=resolve(import.meta.dirname,'../../.impeccable/review')
  await mkdir(shots,{recursive:true})
  for(const width of [360,390,768,1024,1440,1920]){
    await page.setViewportSize({width,height:width<700?820:930})
    if(width<670)await page.getByRole('button',{name:'Kết quả',exact:true}).click()
    await page.getByText('Đạt',{exact:true}).scrollIntoViewIfNeeded()
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if([390,1440].includes(width)) await page.screenshot({path:resolve(shots,'worker-accepted-'+width+'.png')})
  }
  assert.equal((await api('/exercises/'+e.slug)).card.progress,'independent')
  const history='/runner/'+e.slug+'/1/jobs'
  const [submitted]=(await api(history)).items
  const placementState=await api('/study-sessions/'+placement.id)
  assert.equal(placementState.coding.submission,submitted.id)
  assert.equal(placementState.codingResult.status,'accepted')
  assert.equal(submitted.status,'accepted');assert(!submitted.output && !submitted.rows)
  await page.getByLabel('Đầu vào tùy chỉnh').fill('1, 4, 4, 5')
  await page.getByRole('button',{name:'Run',exact:true}).click()
  await page.getByText('false',{exact:true}).first().waitFor({timeout:45000})
  assert.equal((await api('/exercises/'+e.slug)).card.progress,'independent')
  await page.close()
  const sql=exercises.get('unbilled-work@1@1')
  const run=await api('/runner/'+sql.slug+'/1/jobs','POST',{id:randomUUID(),action:'submit',code:sql.solution})
  // No job polling from a browser. Only the API's reconciler can persist the terminal verdict.
  let row
  for(let i=0;i<42;i++){
    row=(await api('/profile/export')).submissions.find(j=>j.id===run.id)
    if(row?.status==='accepted')break
    await new Promise(ok=>setTimeout(ok,2500))
  }
  assert.equal(row?.status,'accepted')
  const dashboard=await api('/dashboard')
  const cards=await api('/exercises')
  assert.equal(dashboard.sqlRemaining,cards.filter(e=>e.kind==='sql'&&e.progress!=='independent').length)
  assert.equal(cards.find(c=>c.slug===sql.slug).progress,'independent')
  assert((await api('/history?kind=sql')).items.some(j=>j.id===run.id && j.status==='accepted'))
  console.log('PASS Chrome Submit/Run, authenticated HTTPS gateway, C#/T-SQL execution, hidden verdict, background sync, history, dashboard and export')
}finally{try{await api('/profile/account/delete','POST',{password})}finally{await browser.close()}}
