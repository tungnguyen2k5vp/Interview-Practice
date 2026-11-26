import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {ZipWriter,Uint8ArrayWriter,TextReader} from '@zip.js/zip.js'

export async function checkPersonalization({page,ctx,peer,send}) {
  const client=ctx.request
  const outbound=[]
  const capture=r=>{if(r.url().includes('/api/'))outbound.push(r.postData()??'')}
  page.on('request',capture)
  try {
    await page.goto('/chuan-bi')
    const zip=new ZipWriter(new Uint8ArrayWriter(),{useWebWorkers:false})
    await zip.add('[Content_Types].xml',new TextReader('<Types/>'))
    await zip.add('word/document.xml',new TextReader('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Project: LocalDocMarker</w:t></w:r></w:p><w:p><w:r><w:t>Async C#</w:t></w:r></w:p></w:body></w:document>'))
    await page.getByLabel('Đọc CV từ TXT, PDF hoặc DOCX').setInputFiles({name:'candidate.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from(await zip.close())})
    await page.getByLabel('Văn bản trích xuất').waitFor()
    assert((await page.getByLabel('Văn bản trích xuất').inputValue()).includes('LocalDocMarker'))
    assert.equal(await page.getByLabel('CV của bạn').inputValue(),'')
    await page.getByRole('button',{name:'Dùng nội dung này'}).click()
    const writer=await ctx.newPage()
    await writer.setContent('<p>Required: SQL</p><p>Nice-to-have: Redis</p><p>LocalPdfMarker</p>')
    const pdf=await writer.pdf();await writer.close()
    await page.getByLabel('Đọc JD từ TXT, PDF hoặc DOCX').setInputFiles({name:'role.pdf',mimeType:'application/pdf',buffer:pdf})
    await page.getByLabel('Văn bản trích xuất').waitFor()
    assert((await page.getByLabel('Văn bản trích xuất').inputValue()).includes('LocalPdfMarker'))
    await page.getByRole('button',{name:'Dùng nội dung này'}).click()
    await page.getByText('Kỹ năng ưu tiên · CV chưa đề cập',{exact:true}).waitFor()
    await page.getByRole('checkbox',{name:'Async / concurrency'}).check()
    await page.getByRole('button',{name:'Lưu trên thiết bị'}).click()
    await page.reload()
    assert.equal(await page.getByLabel('CV của bạn').inputValue(),'')
    await page.getByRole('button',{name:'Mở bản đã lưu'}).click()
    assert(await page.getByRole('checkbox',{name:'Async / concurrency'}).isChecked())
    await page.getByRole('button',{name:'Xóa CV và JD'}).click()
    assert(!await page.getByRole('button',{name:'Mở bản đã lưu'}).count())
    assert(!outbound.some(p=>p.includes('LocalDocMarker')||p.includes('LocalPdfMarker')))
    const levels=['intern','fresher','junior']
    for(const level of levels){
      const input={id:randomUUID(),level}
      const assessment=await send(client,'/placement','POST',input)
      assert.equal(assessment.items.length,4);assert.equal(assessment.level,level);assert(!assessment.coding)
      assert.equal((await send(client,'/placement','POST',input)).id,assessment.id)
      await send(peer.request,'/study-sessions/'+assessment.id,'GET',undefined,[404])
      if(level==='intern'){
        for(const [slug,choice,correct] of [['tryparse-zero',0,true],['integer-division',2,false]]){
          const item=assessment.items.find(i=>i.slug===slug)
          const attempt=await send(client,'/practice/questions/'+slug+'/submit','POST',{cursor:{id:randomUUID(),revision:0,version:item.version},language:'vi',activeSeconds:0,skip:false,choice,studySessionId:assessment.id},[201])
          assert.equal(attempt.correct,correct)
        }
      }
      await send(client,'/study-sessions/'+assessment.id+'/finish','POST')
      await page.goto('/phien-hoc/'+assessment.id)
      await page.getByRole('heading',{name:'Kết quả kiểm tra đầu vào'}).waitFor()
      if(level==='intern'){
        await page.getByText(/1\/4 câu có bằng chứng độc lập/).waitFor()
        await page.getByRole('button',{name:'Ưu tiên các chủ đề này trong lộ trình'}).click()
        await page.getByRole('button',{name:'Đã ưu tiên trong lộ trình'}).waitFor()
      }
    }
    await send(client,'/placement','POST',{id:randomUUID(),level:'expert'},[400])
    const tree=await send(client,'/skills/tree')
    const ids=new Set(tree.flatMap(t=>t.nodes.map(n=>n.slug)))
    assert.equal(tree.length,11)
    assert(tree.every(t=>t.nodes.length>0 && t.nodes.every(n=>n.prerequisites.every(p=>ids.has(p)))))
    await page.goto('/ky-nang');await page.getByRole('combobox',{name:'Nhóm kỹ năng'}).selectOption('aspnet')
    await page.getByRole('heading',{name:'ASP.NET Core'}).waitFor()
    await page.locator('details').first().locator('summary').focus();await page.keyboard.press('Enter')
    await page.getByRole('link',{name:'Luyện câu này'}).first().waitFor()
  } finally {page.off('request',capture)}
}
