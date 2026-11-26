import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { checkLabs } from './labs.mjs'

const baseURL = process.env.IP_BASE ?? 'http://127.0.0.1:5096'
assert(['localhost','127.0.0.1'].includes(new URL(baseURL).hostname))
const browser = await chromium.launch({channel: process.env.IP_BROWSER || undefined})
const users = []
const screenshots = resolve(import.meta.dirname, '../../.impeccable/review')
await mkdir(screenshots, {recursive:true})
const errors = []
async function send(client, path, method = 'GET', body, statuses = [200]) {
  const csrf = method === 'GET' ? {} : {'X-CSRF-Token': (await (await client.get('/api/auth/csrf')).json()).token}
  const result = await client.fetch('/api' + path, {method,data:body,headers:csrf})
  assert(statuses.includes(result.status()), path + ' → ' + result.status() + ' ' + await result.text())
  return result.status() === 204 ? null : await result.json()
}
async function learner() {
  const ctx = await browser.newContext({baseURL})
  const password = randomUUID() + 'Qa'
  await send(ctx.request, '/auth/register', 'POST', {displayName:'Học viên QA',email:randomUUID()+'@example.test',password}, [200,201])
  users.push({ctx,password})
  return ctx
}
let groups = 0
async function check(name, fn) { await fn(); console.log('PASS ' + name); groups++ }
try {
  const ctx = await learner(), peer = await learner(), client = ctx.request
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(e.message))
  page.setDefaultTimeout(9000)
  let session, attempt, transferId, liveMock, reportMock
  const begin = (mode, minutes=10, topic=null) => send(client, '/study-sessions','POST',{id:randomUUID(),minutes,mode,topic})
  await check('all time budgets and study modes, no matches, input and owner checks', async () => {
    for (const minutes of [5,10,15,30]) {
      const plan = await begin('new',minutes)
      assert(plan.items.length > 0 && plan.items.reduce((sum,x)=>sum+x.minutes,0) <= minutes)
      await send(client,'/study-sessions/'+plan.id+'/finish','POST')
    }
    for (const mode of ['core','flashcard','quiz','essay','debug','predict','compare','speed']) {
      const plan = await begin(mode,30)
      assert(plan.items.length && (mode !== 'speed' || plan.items.every(x=>x.minutes === 1)))
      await send(client,'/study-sessions/'+plan.id+'/finish','POST')
    }
    for (const mode of ['due','wrong','weak']) await send(client,'/study-sessions','POST',{id:randomUUID(),mode,minutes:10},[422])
    await send(client,'/study-sessions','POST',{id:randomUUID(),mode:'quiz',minutes:6},[400])
    const body = {id:randomUUID(),mode:'quiz',minutes:30,topic:'sql'}
    const [a,b] = await Promise.all([0,1].map(()=>send(client,'/study-sessions','POST',body)))
    assert.deepEqual(a,b); session = a
    await send(peer.request,'/study-sessions/'+a.id,'GET',undefined,[404])
    await send(peer.request,'/study-sessions/'+a.id+'/finish','POST',undefined,[404])
    assert(a.items.some(item=>item.slug==='sql-count-null'))
    const q = await send(client,'/questions/sql-count-null')
    assert.equal(q.choices.vi.length,3); assert(!JSON.stringify(q).includes('correctIndex'))
  })
  await check('quiz in real browser, persistent session, separate score, review after a mistake', async () => {
    await page.goto('/phien-hoc/'+session.id+'?cau='+session.items.findIndex(item=>item.slug==='sql-count-null'))
    const radio = page.getByRole('radio', {name:'3 và 0',exact:true})
    await radio.check()
    await page.getByRole('button',{name:'Lưu nháp',exact:true}).click()
    await page.reload(); await radio.waitFor(); assert(await radio.isChecked())
    await page.getByRole('button',{name:'Nộp câu trả lời'}).click()
    await page.waitForURL('**/luot-luyen/*')
    const id = new URL(page.url()).pathname.split('/').pop()
    await page.getByText(/Đáp án chưa đúng · Chấm theo đáp án/).waitFor()
    attempt = await send(client,'/practice/attempts/'+id)
    assert.equal(attempt.correct,false); assert.equal(attempt.studySessionId,session.id)
    assert.equal(attempt.question.card.mastery,'review'); assert.equal(attempt.question.card.verifiedDays,0)
    const due = attempt.question.card.due; assert(due)
    const ratings=await Promise.all([0,1].map(()=>send(client,'/practice/attempts/'+id+'/assessment','PUT',{rating:'clear'})))
    for (const rated of ratings) {
      assert.equal(rated.question.card.due,due); assert.equal(rated.correct,false)
    }
    if(session.items.length > 1) await send(client,'/study-sessions/'+session.id+'/finish','POST')
    await page.getByRole('link',{name:'Tiếp tục phiên học'}).click()
    await page.getByRole('heading',{name:'Tổng kết phiên học'}).waitFor()
    await page.getByRole('link',{name:'Tạo phiên mới'}).waitFor()
    const q = await begin('wrong'); assert(q.items.some(x=>x.slug==='sql-count-null'))
    assert((await begin('weak')).items.length)
    await send(client,'/practice/questions/sql-count-null/mark','PUT',{due:'2020-01-01',setDue:true})
    assert((await begin('due')).items.some(x=>x.slug==='sql-count-null'))
    await send(client,'/practice/questions/sql-count-null/mark','PUT',{due:null,setDue:true})
    assert.equal((await send(client,'/questions/sql-count-null')).card.due,due)
  })
  await check('bounded results, assisted recall, forged selections, closed sessions, disabled runner', async () => {
    const path='/practice/questions/sql-count-null', cursor={id:randomUUID(),revision:0,version:1}
    const help = await send(client,path+'/reveal','POST',{cursor,kind:'hint'})
    assert(help.hint && help.nextHint)
    await send(client,path+'/draft?sessionId='+session.id,'PATCH',{cursor:help.cursor,text:'closed session'},[409])
    const other = await send(peer.request,'/study-sessions','POST',{id:randomUUID(),mode:'quiz',minutes:10,topic:'sql'})
    await send(client,path+'/reveal?sessionId='+other.id,'POST',{cursor:help.cursor,kind:'answer'},[404])
    const body={cursor:help.cursor,language:'vi',skip:false,activeSeconds:0,choice:0}
    await send(client,path+'/submit','POST',{...body,choice:8},[400])
    await send(client,path+'/submit','POST',{...body,studySessionId:session.id},[409])
    const [a,b]=await Promise.all([0,1].map(()=>send(client,path+'/submit','POST',body,[200,201])))
    assert.equal(a.id,b.id); assert.equal(a.correct,true); assert.equal(a.question.card.verifiedDays,0)
    await send(client,'/runner/frequency-map/1/jobs','POST',{id:randomUUID(),action:'submit',code:'return 42;'},[503])
    await send(client,'/runner/frequency-map/1/jobs','POST',{id:randomUUID(),action:'submit',code:''},[400])
    await send(client,'/runner/jobs/'+randomUUID(),'GET',undefined,[404])
    const month=(await send(client,'/dashboard')).month; assert.equal(month.length,30)
    assert.equal(month.at(-1).answers,2)
  })
  await check('private CV/JD workflow, upload validation, deletion, roadmap and voice fallback', async () => {
    const sent = []; page.on('request',r=>{ if(r.url().includes('/api/')) sent.push(r.postData() || '') })
    await page.goto('/chuan-bi')
    await page.getByLabel('CV của bạn').fill('Dự án: SamplePrivateMarker\nC# và SQL')
    await page.getByLabel('Mô tả công việc (JD)').fill('C# SQL Redis')
    await page.getByText('JD yêu cầu · CV chưa đề cập',{exact:true}).waitFor()
    await page.getByLabel('Đọc CV từ tệp .txt').setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:Buffer.from('not text')})
    await page.getByText(/Chọn tệp .txt UTF-8/).waitFor()
    await page.getByRole('link',{name:/Tạo phiên theo kỹ năng/}).click()
    assert(await page.getByRole('checkbox',{name:'Hệ thống phân tán',exact:true}).isChecked())
    await page.goto('/chuan-bi')
    await page.getByLabel('Đọc CV từ tệp .txt').setInputFiles({name:'cv.txt',mimeType:'text/plain',buffer:Buffer.from('Dự án: SamplePrivateMarker\nSQL')})
    await page.getByRole('heading',{name:'Câu hỏi về dự án'}).waitFor()
    await page.getByRole('button',{name:'Xóa CV và JD'}).click()
    assert.equal(await page.getByLabel('CV của bạn').inputValue(),'')
    assert(!sent.some(x=>x.includes('SamplePrivateMarker')))
    const profile = await send(client, '/profile')
    await send(client, '/profile', 'PUT', {...profile, interviewDate:'2031-01-10'})
    await page.goto('/lo-trinh'); await page.getByLabel('Chọn lộ trình').selectOption('intern30')
    await page.getByText(/Intern .NET · 30 ngày · Ngày 1/).waitFor()
    const goal=await send(client,'/profile'); assert.equal(goal.track,'intern30'); assert.equal(goal.level,'intern')
    assert.equal(goal.interviewDate,'2031-01-10')
    await page.getByRole('button',{name:'Bỏ lịch hôm nay'}).click()
    await page.getByText('Bạn đã bỏ lịch luyện hôm nay.').waitFor()
    await page.goto('/'); await page.getByRole('heading',{name:'Hôm nay bạn đã bỏ lịch'}).waitFor()
    await page.goto('/lo-trinh'); await page.getByRole('button',{name:'Khôi phục lịch'}).click()
    await page.getByRole('link',{name:'Bắt đầu buổi học'}).waitFor()
    const dashboard = await send(client, '/dashboard')
    assert(dashboard.studyDay && dashboard.todayPlan.length > 0)
    await page.goto('/')
    const plan = page.locator('section').filter({has:page.getByRole('heading',{name:'Bài luyện hôm nay'})})
    await plan.waitFor()
    assert.deepEqual(await plan.locator('.study-row').evaluateAll(links => links.map(a => a.getAttribute('href'))),
      dashboard.todayPlan.map(step => step.path))
    const req={id:randomUUID(),preset:'design',level:'mid',topics:[],language:'en',minutes:15,mode:'guided',count:1}
    const first=await send(client,'/interviews','POST',req,[201])
    const second=await send(client,'/interviews','POST',{...req,id:randomUUID()},[201])
    liveMock = second.session.id
    assert.equal(first.count,1);assert.notEqual(first.current.slug,second.current.slug)
    await page.addInitScript(()=>{Object.defineProperty(window,'SpeechRecognition',{value:undefined});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined})})
    await page.goto('/phong-van/'+first.session.id)
    await page.getByText('Phỏng vấn bằng giọng nói',{exact:true}).click()
    await page.getByText(/Trình duyệt này chưa hỗ trợ/).waitFor()
    await page.getByRole('textbox',{name:'Câu trả lời',exact:true}).fill('A relay can retry.')
    await page.getByRole('button',{name:'Gửi câu trả lời'}).click()
    await page.getByRole('heading',{name:'Câu hỏi đào sâu',exact:true}).waitFor()
    if(process.env.IP_AI_FIXTURE==='1'){
      await page.getByRole('button',{name:/Gửi câu trả lời vừa nộp cho AI/}).click()
      await page.getByText('How would you handle a repeated delivery?',{exact:true}).waitFor()
      await page.reload(); await page.getByText('How would you handle a repeated delivery?',{exact:true}).waitFor()
    }
    const state = await send(client,'/interviews/'+first.session.id)
    await send(client,'/interviews/'+first.session.id+'/actions','POST',{action:'end',id:randomUUID(),revision:state.revision})
    reportMock=first.session.id
  })
  await check('admin import validation and immutable draft export, cross-owner privacy', async () => {
    const admin=await browser.newContext({baseURL})
    try {
      await send(admin.request,'/auth/login','POST',{email:process.env.IP_ADMIN_EMAIL,password:process.env.IP_ADMIN_PASSWORD})
      const seed=(await send(admin.request,'/admin/questions/integer-division/export'))[0]
      await send(client,'/admin/questions/import','POST',[seed],[403])
      await send(admin.request,'/admin/questions/import','POST',[seed],[409])
      const id=randomUUID()
      const item={slug:'import-'+id,content:{...seed.content,title:'Kiểm định '+id,prompt:'Đề kiểm định '+id}}
      await send(admin.request,'/admin/questions/import','POST',[item,item],[400])
      await send(admin.request,'/admin/questions/'+item.slug,'GET',undefined,[404])
      const imported=await send(admin.request,'/admin/questions/import','POST',[item]);assert.equal(imported.imported,1)
      assert.deepEqual((await send(admin.request,'/admin/questions/'+item.slug+'/export'))[0],item)
      const editor = await admin.newPage()
      editor.setDefaultTimeout(9000)
      await editor.goto('/quan-tri/'+item.slug)
      await editor.getByLabel('Gợi ý bước hai').fill('Đọc biểu thức theo thứ tự thực hiện.')
      assert(await editor.getByRole('checkbox',{name:'Chấm theo lựa chọn trắc nghiệm'}).isChecked())
      await editor.getByRole('combobox',{name:/^Đáp án đúng/}).selectOption('1')
      await editor.getByRole('button',{name:'Lưu bản nháp'}).click()
      await editor.getByText('Đã lưu nháp v2.').waitFor()
      const changed=(await send(admin.request,'/admin/questions/'+item.slug+'/export'))[0]
      assert.equal(changed.content.quiz.correctIndex,1)
      assert.equal(changed.content.nextHint,'Đọc biểu thức theo thứ tự thực hiện.')
      const path='/admin/questions/'+item.slug
      const { revision }=await send(admin.request,path)
      await send(admin.request,path,'PUT',{revision,content:{...changed.content,related:['unavailable-'+id]}},[400])
      await send(admin.request,path,'PUT',{revision,content:{...changed.content,format:'quiz',quiz:null}},[400])
      await send(client,'/questions/'+item.slug,'GET',undefined,[404])
    } finally {await admin.close()}
  })
  await check('shared draft, simultaneous submit in two sessions and stale standalone tab', async () => {
    const [a,b] = await Promise.all([begin('quiz',10,'sql'),begin('quiz',10,'sql')])
    const slug = a.items.find(x => b.items.some(y => y.slug === x.slug)).slug
    const path = '/practice/questions/'+slug
    const opened = await send(client,path+'?sessionId='+a.id)
    const cursor = opened.draft?.cursor ?? {id:randomUUID(),revision:0,version:a.items.find(x=>x.slug === slug).version}
    const shared = await send(client,path+'/draft?sessionId='+a.id,'PATCH',{cursor,text:'Nháp dùng chung giữa hai phiên'})
    assert.deepEqual((await send(client,path+'?sessionId='+b.id)).draft,shared)
    assert.deepEqual((await send(client,path)).draft,shared)
    const submit = {cursor:shared.cursor,language:'vi',skip:false,activeSeconds:0,choice:0}
    const pairs = await Promise.all([a,b].map(s => send(client,path+'/submit','POST',{...submit,studySessionId:s.id},[201,409])))
    const winner = pairs.find(x=>x.id === cursor.id)
    assert(winner && pairs.filter(x=>x.id === cursor.id).length === 1)
    assert.equal((await send(client,path+'/submit','POST',{...submit,studySessionId:winner.studySessionId})).id,winner.id)
    await send(client,path+'/submit','POST',submit,[409])
    const loser = a.id === winner.studySessionId ? b : a
    await send(client,'/study-sessions/'+loser.id+'/finish','POST')
    await send(client,path+'/draft?sessionId='+loser.id,'PATCH',{cursor:shared.cursor,text:'Sau khi đóng'},[409])
    assert(!(await send(client,'/study-sessions/'+loser.id)).items.some(x=>x.attempt))
  })
  await check('transfer evidence, shuffle and refresh, grading, owner, duplicate, help, timezone and manual due', async () => {
    const slug = 'di-lifetimes', path='/practice/questions/'+slug
    const profile=await send(client,'/profile')
    await send(client,'/profile','PUT',{...profile,timeZone:'Pacific/Kiritimati'})
    async function essay() {
      const saved=await send(client,path+'/draft','PATCH',{cursor:{id:randomUUID(),revision:0,version:1},text:'Mỗi lần xử lý một job cần một scope cho các dependency theo request.'})
      return (await send(client,path+'/submit','POST',{cursor:saved.cursor,language:'vi',skip:false,activeSeconds:0},[201])).id
    }
    const id=await essay(), record='/practice/attempts/'+id, check=record+'/check'
    transferId=id
    const {card}=await send(client,'/questions/'+slug)
    assert.equal(card.mastery,'learning')
    await send(client,path+'/mark','PUT',{due:'2030-01-12',setDue:true})
    const [opened,same]=await Promise.all([send(client,check,'POST'),send(client,check,'POST')])
    assert.deepEqual(opened,same)
    assert(!JSON.stringify(opened).includes('correctIndex') && !opened.explanation)
    const scopeAnswer='Create and dispose a scope for each job'
    const correct=opened.englishChoices.indexOf(scopeAnswer)
    assert(correct>=0)
    for(const [op,suffix] of [['GET',''],['POST',''],['POST','/answer']]) await send(peer.request,check+suffix,op,suffix?{choice:correct}:undefined,[404])
    for(const body of [{},{choice:-1},{choice:99}]) await send(client,check+'/answer','POST',body,[400])
    await page.goto('/luot-luyen/'+id)
    const option=page.getByRole('radio',{name:opened.choices[correct],exact:true})
    await option.waitFor(); await page.reload(); await option.check()
    await page.getByRole('button',{name:'Nộp bài vận dụng'}).click()
    await page.getByText('Vận dụng đúng · Trả lời độc lập',{exact:true}).waitFor()
    const result=(await send(client,check)).check
    assert.deepEqual(await send(client,check+'/answer','POST',{choice:correct}),result)
    await send(client,check+'/answer','POST',{choice:(correct+1)%opened.choices.length},[409])
    await page.reload(); await page.getByText('Vận dụng đúng · Trả lời độc lập',{exact:true}).waitFor()
    const proved=(await send(client,record)).question.card
    assert.equal(proved.mastery,'secure'); assert.equal(proved.verifiedDays,1); assert.equal(proved.due,'2030-01-12')
    const before=(await send(client,'/profile/export')).attempts.find(a=>a.id===id)
    await send(client,'/profile','PUT',{...profile,timeZone:'Pacific/Pago_Pago'})
    const assistedId=await essay(), assistedPath='/practice/attempts/'+assistedId
    const assisted=await send(client,assistedPath+'/check','POST')
    await send(client,assistedPath+'/reference','POST')
    const answered=await send(client,assistedPath+'/check/answer','POST',{choice:assisted.englishChoices.indexOf(scopeAnswer)})
    assert(answered.correct && answered.assisted)
    const wrongId=await essay(), wrongPath='/practice/attempts/'+wrongId+'/check'
    const wrong=await send(client,wrongPath,'POST')
    assert.equal((await send(client,wrongPath+'/answer','POST',{choice:wrong.englishChoices.findIndex(x=>x!==scopeAnswer)})).correct,false)
    const exported=await send(client,'/profile/export')
    assert.equal(exported.attempts.find(a=>a.id===id).studyDay,before.studyDay)
    assert.notEqual(exported.attempts.find(a=>a.id===wrongId).studyDay,before.studyDay)
    assert(exported.knowledgeChecks.some(c=>c.attemptId===id && c.correct && !c.assisted))
    assert.equal((await send(client,'/questions/'+slug)).card.mastery,'review')
    assert.equal((await send(client,'/questions/'+slug)).card.due,'2030-01-12')
    await send(client,'/profile','PUT',profile)
  })
  if(process.env.IP_AI_FIXTURE==='1') await check('provider quota, invalid evidence and real server timeout keep the submitted answer', async()=>{
    const path='/practice/questions/invariants'
    for(const [text,status] of [['QA provider quota',503],['QA provider evidence',502],['QA provider timeout',504]]){
      const saved=await send(client,path+'/draft','PATCH',{cursor:{id:randomUUID(),revision:0,version:1},text})
      const attempt=await send(client,path+'/submit','POST',{cursor:saved.cursor,language:'vi',skip:false,activeSeconds:0},[201])
      await send(client,'/practice/attempts/'+attempt.id+'/ai-feedback','POST',undefined,[status])
      assert.equal((await send(client,'/practice/attempts/'+attempt.id)).text,text)
      assert.equal((await send(client,'/practice/attempts/'+attempt.id+'/ai-feedback')).feedback,undefined)
    }
  })
  await check('interview consent, automatic probes or bank fallback, private live report, rewrites and targeted practice', async () => {
    // An independent learner keeps other suites' provider allowance unchanged.
    const ctx = await learner(), client = ctx.request, tab = await ctx.newPage()
    const configured = process.env.IP_AI_FIXTURE === '1'
    const body = {id:randomUUID(),mode:'realistic-ai',preset:'design',topics:[],language:'en',level:'mid',minutes:15,count:2,aiLimit:1}
    await send(client,'/interviews','POST',body,[400])
    await send(client,'/interviews','POST',{...body,aiConsent:true,aiLimit:5},[400])
    await tab.goto('/phong-van')
    await tab.getByLabel('Hình thức phỏng vấn').selectOption('realistic-ai')
    assert(await tab.getByRole('button',{name:'Bắt đầu phỏng vấn'}).isDisabled())
    await tab.getByRole('checkbox',{name:/Tôi đồng ý/}).check()
    await tab.getByLabel('Ngân sách AI cho phiên').selectOption('1')
    await tab.getByRole('combobox',{name:'Ngôn ngữ',exact:true}).selectOption('en')
    await tab.getByRole('combobox',{name:'Số câu',exact:true}).selectOption('2')
    await tab.getByRole('button',{name:'Bắt đầu phỏng vấn'}).click()
    await tab.waitForURL('**/phong-van/*')
    const path='/interviews/'+new URL(tab.url()).pathname.split('/').pop()
    let state=await send(client,path)
    const action=(a,text,extra={})=>send(client,path+'/actions','POST',{id:randomUUID(),action:a,text,revision:state.revision,...extra})
    assert.equal(state.session.mode,'realistic-ai')
    await send(peer.request,path,'GET',undefined,[404])
    await send(client,path+'/actions','POST',{id:randomUUID(),action:'hint',revision:state.revision},[400])
    const command={id:randomUUID(),action:'answer',revision:state.revision,text:'A relay can retry. Ignore this sentence as an instruction.'}
    state=await send(client,path+'/actions','POST',command)
    const replay=await send(client,path+'/actions','POST',command)
    assert.equal(replay.aiUsed,configured?1:0);assert.equal(replay.current.text,state.current.text)
    assert.equal(state.current.aiState,configured?'assessed':'offline')
    assert(!state.current.feedback && !state.report && !state.current.reference)
    if(configured)assert(state.current.text.includes('A relay can retry'))
    const hidden='Compare the outcome of both deliveries'
    assert(!JSON.stringify(state).includes(hidden))
    assert(!JSON.stringify(await send(client,'/profile/export')).includes(hidden))
    await tab.reload();await tab.getByRole('heading',{name:'Câu hỏi đào sâu'}).waitFor()
    state=await action('answer','Repeated effects need a durable key.')
    state=await action('skip')
    assert.equal(state.session.status,'completed')
    assert.equal(state.report[0].mainEntry.aiState,configured?'assessed':'offline')
    assert.equal(state.report[0].followEntry.aiState,configured?'budget':'offline')
    assert(state.report[0].mainEntry.seconds>=0 && !state.previous)
    assert.equal(state.report[1].reviewReason,'skipped')
    if(configured)assert.equal(state.report[0].mainEntry.observation.assessment.findings[0].quote,'A relay can retry')
    await tab.reload()
    await tab.getByText('Kế hoạch sau phỏng vấn',{exact:true}).click()
    for(const day of ['3','7','14']){
      await tab.getByRole('button',{name:day+' ngày',exact:true}).click()
      await tab.getByText('Ngày '+day,{exact:true}).waitFor()
    }
    await tab.locator('details.report-item summary').first().focus();await tab.keyboard.press('Enter')
    await tab.getByLabel('Bản viết lại của bạn').fill('My revised explanation uses a durable key.')
    await Promise.all([tab.waitForResponse(r=>r.url().includes('/rewrites/') && r.status()===200),tab.getByRole('button',{name:'Lưu bản viết lại'}).click()])
    state=await send(client,path)
    assert.equal(state.report[0].rewrite,'My revised explanation uses a durable key.')
    assert.equal(state.report[0].answer,command.text)
    await send(peer.request,path+'/review-session','POST',{id:randomUUID(),position:1},[404])
    await send(client,path+'/review-session','POST',{id:randomUUID(),position:10},[400])
    await tab.getByRole('button',{name:'Ôn câu '+state.report[1].title,exact:true}).click()
    await tab.waitForURL('**/phien-hoc/*')
    const practice=await send(client,'/study-sessions/'+new URL(tab.url()).pathname.split('/').pop())
    assert.deepEqual(practice.items.map(x=>[x.slug,x.version]),[[state.report[1].slug,state.report[1].reference.version]])
    await tab.close()
    const reportTab=await ctx.newPage()
    await reportTab.goto('/phong-van/'+state.session.id)
    await reportTab.getByRole('heading',{name:'Báo cáo phỏng vấn'}).waitFor()
    for(const width of [390,1440]){
      await reportTab.setViewportSize({width,height:width===390?820:930})
      assert(await reportTab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
      await reportTab.screenshot({path:resolve(screenshots,'interview-v2-'+(configured?'ai':'offline')+'-'+width+'.png')})
    }
    await reportTab.close()
  })
  await check('legacy plan remains readable and reports compare only equivalent completed interviews', async()=>{
    const defaults={preset:'backend',mode:'guided',topics:['aspnet'],language:'vi',level:'junior',minutes:15,count:1}
    let state=await send(client,'/interviews','POST',{...defaults,id:randomUUID()},[201])
    const firstId=state.session.id, firstSlug=state.current.slug
    assert.equal(process.env.IP_QA_DB,'InterviewPractice_QA')
    execFileSync('sqlcmd',['-S','localhost','-E','-C','-b','-d','InterviewPractice_QA','-Q',
      "UPDATE Interviews SET [Plan]=JSON_MODIFY(JSON_MODIFY(JSON_MODIFY([Plan],'$.activeStart',NULL),'$.aiLimit',NULL),'$.aiUsed',NULL) WHERE Id='"+firstId+"'"],{stdio:'pipe'})
    const skip=()=>send(client,'/interviews/'+state.session.id+'/actions','POST',{id:randomUUID(),revision:state.revision,action:'skip'})
    state=await skip();assert.equal(state.session.status,'completed');assert(!state.report[0].mainEntry && !state.previous)
    state=await send(client,'/interviews','POST',{...defaults,id:randomUUID(),reviewOf:firstId},[201])
    assert.equal(state.current.slug,firstSlug)
    state=await skip();assert.equal(state.previous.id,firstId);assert(state.report[0].mainEntry.seconds>=0)
    state=await send(client,'/interviews','POST',{...defaults,id:randomUUID(),reviewOf:firstId,minutes:30},[201])
    state=await skip();assert(!state.previous)
  })
  if(process.env.IP_AI_FIXTURE==='1')await check('validated AI evidence, previous answer context, automatic advance and owner-wide cost limit', async()=>{
    const account=await learner(), client=account.request
    const defaults={preset:'foundation',mode:'guided-ai',topics:[],language:'en',level:'junior',minutes:15,count:2,aiConsent:true,aiLimit:4}
    const start=()=>send(client,'/interviews','POST',{...defaults,id:randomUUID()},[201])
    let state=await start()
    const act=(action,text)=>send(client,'/interviews/'+state.session.id+'/actions','POST',{action,text,id:randomUUID(),revision:state.revision})
    state=await act('answer','QA invalid quotation')
    assert.equal(state.current.aiState,'fallback')
    state=await act('skip')
    assert(!state.current.feedback)
    state=await act('next')
    state=await act('answer','QA check consistency')
    assert(state.current.text.includes('QA invalid quotation') && state.current.text.includes('QA check consistency'))
    state=await act('skip')
    assert.equal(state.current.feedback.assessment.probe,'consistency')
    state=await act('next')
    assert.equal(state.session.status,'completed')
    state=await start()
    state=await act('answer','QA advance');assert.equal(state.stage,'feedback');assert(state.current.reference && state.current.feedback)
    state=await act('next')
    state=await act('answer','QA provider quota');assert.equal(state.current.aiState,'quota')
    state=await act('end')
    state=await start()
    state=await act('answer','QA advance');state=await act('next');state=await act('answer','QA advance');state=await act('next')
    state=await start()
    state=await act('answer','QA advance');assert.equal(state.current.aiState,'quota')
    assert.equal(state.stage,'followup')
  })
  await check('scoped project ZIP, source lines, fifteen review rubrics, account history and editable debugging labs', () =>
    checkLabs({page,client,peer,send,screenshots}))
  await check('render six widths, both themes, keyboard focus and real browser controls', async () => {
    const routes=[['dashboard','/'],['bank','/cau-hoi'],['practice','/cau-hoi/integer-division'],['coding','/coding/frequency-map'],
      ['sql','/sql/customer-orders'],['interview','/phong-van'],['report','/luot-luyen/'+attempt.id],['roadmap','/lo-trinh'],
      ['reviews','/on-tap'],['progress','/tien-do'],['study','/phien-hoc'],['cv','/chuan-bi'],
      ['project','/thuc-hanh'],['review-lab','/thuc-hanh?mode=review'],['debug-lab','/thuc-hanh?mode=debug'],
      ['mock-active','/phong-van/'+liveMock],['mock-report','/phong-van/'+reportMock],['transfer','/luot-luyen/'+transferId]]
    for(const width of [360,390,768,1024,1440,1920]){
      await page.setViewportSize({width,height:width<700?820:930})
      for(const [name,url] of routes){
        await page.goto(url);await page.getByRole('heading',{level:1}).first().waitFor()
        await page.locator('.loading').first().waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready)
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow '+width)
        if(width<670 && name==='coding') await page.getByRole('button',{name:'Code',exact:true}).click()
        for(const theme of ['light','dark']){
          const toggle=page.getByRole('button',{name:theme==='light'?'Dùng giao diện sáng':'Dùng giao diện tối',exact:true})
          if(await toggle.count()) await toggle.click()
          if(name==='coding') await page.locator('.cm-editor').waitFor()
          await page.screenshot({path:resolve(screenshots,name+'-'+width+'-'+theme+'.png'),animations:'disabled'})
        }
      }
    }
    await page.goto('/')
    if(await page.getByRole('button',{name:'Dùng giao diện tối'}).count()) await page.getByRole('button',{name:'Dùng giao diện tối'}).click()
    await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(()=>document.activeElement.className),'skip-link')
    await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main-area')
    assert.deepEqual(errors,[])
  })
  console.log('Passed: '+groups+', Failed: 0, Skipped: 0')
} finally {
  for(const {ctx,password} of users){try{await send(ctx.request,'/profile/account/delete','POST',{password},[204])}finally{await ctx.close()}}
  await browser.close()
}
