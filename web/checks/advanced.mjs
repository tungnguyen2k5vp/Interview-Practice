import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

export async function advanced({page,ctx,browser,baseURL,send,screenshots}){
  const flash=await send(ctx.request,'/study-sessions','POST',{id:randomUUID(),mode:'flashcard',minutes:5,topic:'delivery'})
  await page.goto('/phien-hoc/'+flash.id)
  const first=flash.items[0]
  await send(ctx.request,'/practice/questions/'+first.slug+'/submit','POST',{
    cursor:{id:randomUUID(),revision:0,version:first.version},language:'vi',activeSeconds:0,studySessionId:flash.id
  },[400])
  const card=page.getByRole('region',{name:'Thẻ ghi nhớ'})
  await card.focus();await page.keyboard.press('Space')
  await page.getByRole('button',{name:'3 · Nhớ được'}).waitFor()
  await card.focus();await page.keyboard.press('3');await page.waitForURL('**/luot-luyen/*')
  const recall=await send(ctx.request,'/practice/attempts/'+new URL(page.url()).pathname.split('/').pop())
  assert.equal(recall.rating,'good');assert.equal(recall.question.card.verifiedDays,0);assert(recall.correct==null)
  await page.goto('/cau-hoi/http-created-location')
  await page.getByRole('checkbox',{name:'201 Created',exact:true}).check()
  await page.getByRole('checkbox',{name:'Location của sản phẩm vừa tạo'}).check()
  await page.getByRole('button',{name:'Nộp câu trả lời'}).click();await page.waitForURL('**/luot-luyen/*')
  await page.getByText('Giải thích từng lựa chọn').click()
  const multi=await send(ctx.request,'/practice/attempts/'+new URL(page.url()).pathname.split('/').pop())
  assert.equal(multi.correct,true);assert.equal(multi.choiceReasons.length,4)
  const post={cursor:{id:randomUUID(),revision:0,version:1},choices:[0],language:'vi',activeSeconds:0}
  await send(ctx.request,'/practice/questions/http-created-location/submit','POST',{...post,choices:[0,0]},[400])
  assert.equal((await send(ctx.request,'/practice/questions/http-created-location/submit','POST',post,[201])).correct,false)
  const speed=await send(ctx.request,'/study-sessions','POST',{id:randomUUID(),mode:'speed',minutes:5,topic:'behavioral'})
  const timed=await ctx.newPage()
  try{
    await timed.goto('/phien-hoc/'+speed.id)
    await timed.getByRole('button',{name:'Bắt đầu 60 giây'}).click()
    const answer=timed.getByRole('textbox',{name:'Câu trả lời của bạn'})
    await answer.fill('Bản nháp trả lời giới hạn thời gian.')
    await timed.getByRole('button',{name:'Lưu nháp',exact:true}).click()
    await timed.reload();assert.equal(await answer.inputValue(),'Bản nháp trả lời giới hạn thời gian.')
    await timed.clock.install();await timed.clock.fastForward(61000)
    await timed.getByText(/Hết 60 giây/).waitFor()
    assert(!await answer.isEditable());assert(await timed.getByRole('button',{name:'Nộp câu trả lời'}).isEnabled())
  }finally{await timed.close()}
  const available=await send(ctx.request,'/design-scenarios')
  assert(available.filter(s=>s.version===1).length>=8)
  assert(available.every(s=>s.rubric.length===5&&s.requirements.length>=1))
  await page.goto('/thuc-hanh')
  await page.getByRole('link',{name:'Thiết kế hệ thống'}).click()
  await page.getByLabel('Tình huống thiết kế').selectOption('booking-system@1')
  const add=page.getByRole('button',{name:'Thêm vào sơ đồ'})
  await add.click()
  await page.getByLabel('Loại thành phần').selectOption('Application Service');await add.click()
  await page.getByLabel('Tên trên sơ đồ').fill('Booking API')
  await page.getByLabel('Ghi chú và đánh đổi').fill('Đưa yêu cầu giữ chỗ vào giao dịch.')
  await page.getByLabel('Thành phần đang chỉnh').selectOption({label:'1. Client'})
  await page.getByLabel('Dữ liệu truyền').fill('Yêu cầu giữ chỗ')
  await page.getByRole('button',{name:'Nối thành phần'}).click()
  const node=page.locator('svg .part').first(),old=await node.getAttribute('transform')
  await node.focus();await page.keyboard.press('ArrowRight')
  assert.notEqual(await node.getAttribute('transform'),old)
  await page.getByRole('status').filter({hasText:/Client · Vị trí/}).waitFor()
  const box=await node.boundingBox(),before=await node.getAttribute('transform')
  await page.mouse.move(box.x+30,box.y+16);await page.mouse.down();await page.mouse.move(box.x+60,box.y+56);await page.mouse.up()
  assert.notEqual(await node.getAttribute('transform'),before)
  await page.getByLabel(/^Nhất quán ·/).fill('Khóa phiên bản chỗ tại thời điểm xác nhận.')
  await page.getByRole('button',{name:'Đối chiếu thiết kế'}).click()
  await page.getByText('2 thành phần · 1 luồng dữ liệu').waitFor()
  await page.reload();await page.getByLabel('Tình huống thiết kế').selectOption('booking-system@1')
  assert.equal(await page.getByLabel(/^Nhất quán ·/).inputValue(),'Khóa phiên bản chỗ tại thời điểm xác nhận.')
  assert.equal(await page.locator('svg line.flow').count(),1)
  const task=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất SVG'}).click()
  const download=await task
  const xml=await readFile(await download.path(),'utf8')
  assert(await page.evaluate(s=>!new DOMParser().parseFromString(s,'image/svg+xml').querySelector('parsererror'),xml))
  assert(xml.includes('Booking API')&&xml.includes('Yêu cầu giữ chỗ')&&xml.includes('Khóa phiên bản'))
  for(const width of [360,390,768,1024,1440,1920]){
    await page.setViewportSize({width,height:width<700?820:930})
    for(const theme of ['light','dark']){
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme)
      await page.evaluate(()=>window.scrollTo(0,0))
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'design width '+width)
      if([390,1440].includes(width))await page.screenshot({path:resolve(screenshots,'design-'+width+'-'+theme+'.png'),animations:'disabled'})
    }
  }
  await page.getByRole('button',{name:'Xóa thành phần'}).click()
  assert.equal(await page.locator('svg line.flow').count(),0)
  const admin=await browser.newContext({baseURL}),client=admin.request
  try{
    await send(client,'/auth/login','POST',{email:process.env.IP_ADMIN_EMAIL,password:process.env.IP_ADMIN_PASSWORD})
    await send(ctx.request,'/admin/materials/audit','GET',undefined,[403])
    const root='/admin/materials/', sample=await send(client,root+'design/url-shortener')
    const slug='qa-design-'+randomUUID()
    await send(ctx.request,root+'design/'+slug,'PUT',{revision:0,content:sample.content},[403])
    await send(client,root+'design/'+slug,'PUT',{revision:0,content:{...sample.content,rubric:[]}},[400])
    const editor=await admin.newPage()
    await editor.goto('/quan-tri/hoc-lieu')
    await editor.getByRole('combobox',{name:/^Học liệu/}).selectOption('url-shortener')
    const slugInput=editor.getByLabel('Slug để lưu hoặc nhân bản')
    await slugInput.fill(slug)
    await editor.getByRole('combobox',{name:/^Học liệu/}).selectOption('booking-system')
    await editor.getByRole('combobox',{name:/^Học liệu/}).selectOption('url-shortener')
    assert.equal(await slugInput.inputValue(),slug)
    await editor.getByRole('button',{name:'Lưu nháp học liệu'}).click()
    await editor.getByRole('button',{name:'Xuất bản học liệu v1'}).waitFor()
    assert(!(await send(ctx.request,'/design-scenarios')).some(s=>s.slug===slug))
    await editor.getByRole('button',{name:'Xuất bản học liệu v1'}).click()
    await editor.getByText(/v1 · Đã xuất bản/).waitFor()
    const next={...sample.content,title:'Phương án được biên tập'}
    await send(client,root+'design/'+slug,'PUT',{revision:1,content:next})
    await send(client,root+'design/'+slug,'PUT',{revision:1,content:next},[409])
    await send(client,root+'design/'+slug+'/2/publish','POST')
    const published=await send(ctx.request,'/design-scenarios')
    assert.equal(published.find(i=>i.slug===slug&&i.version===1).title,sample.content.title)
    assert.equal(published.find(i=>i.slug===slug&&i.version===2).title,next.title)
    for(const kind of ['exercise','review','preset','topic','track']){
      const [first]=await send(client,root+kind);const doc=await send(client,root+kind+'/'+first.slug)
      assert(doc.content&&doc.version>=1)
    }
    const events=await send(client,root+'audit')
    assert.deepEqual(events.filter(e=>e.slug===slug).map(e=>e.action),['release','draft','release','draft'])
    await editor.getByText('Nhật ký quản trị',{exact:true}).click()
    await editor.getByText(slug+' · v2',{exact:true}).first().waitFor()
    for(const width of [390,1440]){
      await editor.setViewportSize({width,height:width===390?820:930})
      assert(await editor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'admin overflow')
      await editor.evaluate(()=>window.scrollTo(0,0))
      await editor.screenshot({animations:'disabled',path:resolve(screenshots,'materials-'+width+'.png')})
    }
  }finally{await admin.close()}
}
