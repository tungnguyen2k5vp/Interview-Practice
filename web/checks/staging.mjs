import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright'

const baseURL=process.env.IP_BASE??'https://127.0.0.1:5106'
const {hostname,protocol}=new URL(baseURL)
assert(['localhost','127.0.0.1'].includes(hostname) && protocol==='https:')
const browser=await chromium.launch({channel:process.env.IP_BROWSER||undefined})
const ctx=await browser.newContext({baseURL,ignoreHTTPSErrors:true,viewport:{width:390,height:820}})
let registered=false
const password=randomUUID()
async function post(path,data){
  const csrf=await ctx.request.get('/api/auth/csrf')
  assert(csrf.ok())
  return ctx.request.post('/api'+path,{data,headers:{'X-CSRF-Token':(await csrf.json()).token}})
}
try{
  const ready=await ctx.request.get('/api/health/ready')
  assert.equal((await ready.json()).status,'ready')
  const page=await ctx.newPage()
  page.setDefaultTimeout(15000)
  const issues=[]
  page.on('pageerror',e=>issues.push(e.message))
  page.on('console',m=>{if(m.type()==='error' && /Content Security Policy|Refused to|CSP/i.test(m.text()))issues.push(m.text())})
  const samples=[]
  for(let i=0;i<20;i++){
    const t=performance.now()
    const result=await ctx.request.get('/api/questions')
    assert.equal(result.status(),200)
    assert((await result.json()).items.length>0)
    samples.push(performance.now()-t)
  }
  const landing=await page.goto('/chuan-bi')
  assert.match(landing.headers()['content-security-policy'],/frame-ancestors 'none'/)
  assert.equal(landing.headers()['x-content-type-options'],'nosniff')
  const account=await post('/auth/register',{email:randomUUID()+'@example.test',password,displayName:'Staging QA'})
  assert.equal(account.status(),201,await account.text())
  registered=true
  assert((await ctx.cookies()).some(c=>c.name==='InterviewPractice.Session' && c.secure && c.httpOnly))
  await page.reload()
  await page.getByRole('heading',{name:'Chuẩn bị theo CV và JD'}).waitFor()
  const writer=await ctx.newPage()
  await writer.setContent('<p>Stage PDF Interview Practice</p>')
  const pdf=await writer.pdf()
  await writer.close()
  await page.getByLabel('Đọc CV từ TXT, PDF hoặc DOCX').setInputFiles({name:'staging.pdf',mimeType:'application/pdf',buffer:pdf})
  assert.match(await page.getByLabel('Văn bản trích xuất').inputValue(),/Stage PDF Interview Practice/)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  assert.deepEqual(issues,[])
  samples.sort((a,b)=>a-b)
  console.log('PASS published HTTPS, readiness, secure cookies, CSP, PDF worker, mobile layout')
  console.log('Loopback /api/questions, n='+samples.length+', median '+samples[9].toFixed(1)+' ms, p95 '+samples[18].toFixed(1)+' ms')
}finally{
  try{if(registered)assert.equal((await post('/profile/account/delete',{password})).status(),204)}
  finally{await browser.close()}
}
