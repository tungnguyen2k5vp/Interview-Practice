import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'

export async function checkLabs({page,client,peer,send,screenshots}) {
  const root=resolve(import.meta.dirname,'../..')
  const zip=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'archive','--format=zip','HEAD','server/Program.cs','server/Catalog.cs'],{cwd:root})
  await page.goto('/thuc-hanh')
  await page.getByRole('button',{name:'Tệp ZIP',exact:true}).click()
  await page.locator('input[type=file]').setInputFiles({name:'sources.zip',mimeType:'application/zip',buffer:zip})
  await page.getByRole('button',{name:'Đọc danh sách tệp'}).click()
  await page.getByRole('checkbox',{name:'server/Program.cs',exact:true}).check()
  await page.getByRole('button',{name:'Tạo câu hỏi từ tệp đã chọn'}).click()
  await page.getByRole('heading',{name:'Phỏng vấn từ mã nguồn'}).waitFor()
  const citation=await page.locator('.lab-citation').innerText()
  const [,line,token]=citation.match(/server\/Program.cs:(\d+) · (.+)/)
  const src=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'show','HEAD:server/Program.cs'],{cwd:root,encoding:'utf8'})
  assert(src.split('\n')[Number(line)-1].includes(token))
  await page.getByRole('textbox',{name:'Lập luận của bạn'}).fill('I would inspect the boundary here.')
  await page.getByRole('button',{name:'Câu sau',exact:true}).click()
  await page.getByRole('button',{name:'Câu trước',exact:true}).click()
  assert.equal(await page.getByRole('textbox',{name:'Lập luận của bạn'}).inputValue(),'I would inspect the boundary here.')
  if(process.env.IP_LIVE_GITHUB==='1'){
    const repo={url:'https://github.com/tungnguyen2k5vp/Interview-Practice'}
    const list=await send(client,'/labs/project/github','POST',repo)
    const path=list.files.find(p=>p.endsWith('/server/Program.cs'));assert(path)
    const analysis=await send(client,'/labs/project/github','POST',{...repo,paths:[path],fingerprint:list.fingerprint})
    assert(analysis.questions.some(q=>q.path===path && q.line>0))
    console.log('PASS live GitHub repository list and selected source lines')
  }
  await page.getByRole('button',{name:'Code review',exact:true}).click()
  const fixtures=(await Promise.all(['code-reviews','code-reviews-batch-02'].map(async name=>JSON.parse(await readFile(resolve(root,'server/Content/'+name+'.json'),'utf8'))))).flat()
  const list=await send(client,'/labs/reviews');assert.equal(list.length,fixtures.length);assert.equal(new Set(list.map(c=>c.slug)).size,fixtures.length)
  for(const f of fixtures){
    const q=await send(client,'/labs/reviews/'+f.slug+'/'+f.version)
    const count=f.diff.filter(l=>!l.startsWith('-')).length
    assert(f.lines.length && f.lines.every(n=>n>0 && n<=count) && q.causes.length===2 && q.repairs.length===2)
    assert(!q.lines && !q.severity && !q.history.length)
  }
  const f=fixtures[0], path='/labs/reviews/'+f.slug+'/'+f.version
  await page.getByRole('radio',{name:'Dòng '+f.lines[0],exact:true}).check()
  await page.getByRole('combobox',{name:'Mức độ ảnh hưởng'}).selectOption(f.severity)
  await page.getByRole('combobox',{name:'Nguyên nhân'}).selectOption(f.cause)
  await page.getByRole('combobox',{name:'Hướng xử lý'}).selectOption(f.repair)
  await page.getByRole('textbox',{name:'Review comment'}).fill('Các dòng giá đang được tải riêng cho từng đơn.')
  await page.getByRole('textbox',{name:'Đề xuất thay đổi và cách kiểm tra'}).fill('Chiếu tổng ở database và đo số truy vấn.')
  await page.getByRole('button',{name:'Gửi review'}).click()
  await page.getByRole('heading',{name:'Đối chiếu rubric'}).waitFor()
  const {history:[review]}=await send(client,path)
  assert(review.located && review.severityMatches && review.causeMatches && review.repairMatches)
  assert.deepEqual(await send(client,path,'POST',review.input),review)
  const wrong=await send(client,path,'POST',{...review.input,id:randomUUID(),line:1,cause:f.otherCause,repair:f.otherRepair})
  assert(!wrong.located && !wrong.causeMatches && !wrong.repairMatches)
  assert.equal((await send(peer.request,path)).history.length,0)
  assert((await send(client,'/profile/export')).codeReviews.some(r=>r.id===review.input.id))
  await page.reload();await page.getByRole('heading',{name:'Review đã gửi'}).waitFor()
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:width<700?820:930})
    await page.locator('.lab-diff').scrollIntoViewIfNeeded()
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await page.screenshot({path:resolve(screenshots,'code-review-'+width+'.png')})
  }
  await page.getByRole('button',{name:'Debugging Lab',exact:true}).click()
  await page.getByRole('link',{name:'Mở editor',exact:true}).first().waitFor()
  assert.equal(await page.getByRole('link',{name:'Mở editor',exact:true}).count(),7)
  await page.getByRole('link',{name:'Middleware chọn nhầm nhánh API'}).click()
  await page.getByRole('heading',{name:'Tái hiện lỗi'}).waitFor()
  await page.locator('.cm-editor').waitFor()
  assert((await page.locator('.cm-content').innerText()).includes('StartsWith('))
}
