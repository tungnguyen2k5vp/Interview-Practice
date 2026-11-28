import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'

export async function contentV4({page,client,send,baseURL,browser,screenshots}){
  const root=resolve(import.meta.dirname,'../..'),dir=resolve(root,'server/Content')
  const files=await readdir(dir)
  const read=async name=>JSON.parse(await readFile(resolve(dir,name),'utf8'))
  const all=async pattern=>(await Promise.all(files.filter(f=>pattern.test(f)).map(read))).flat()
  const exercises=await all(/^exercises-batch-(1[0-6])-v4-.*\.json$/)
  const reviewCases=await read('code-reviews-batch-03-v4.json')
  const designs=await read('system-design-batch-03-v4.json')
  const designSeeds=await all(/^system-design(?:-batch-.*)?\.json$/)
  const projects=await read('project-scenarios-batch-02-v4.json')
  const presets=await read('interview-presets-batch-02-v4.json')
  assert.equal(exercises.length,95)
  assert.equal((await send(client,'/questions')).total,500)
  assert.equal((await send(client,'/exercises?kind=coding')).length,80)
  assert.equal((await send(client,'/exercises?kind=sql')).length,60)
  assert.equal((await send(client,'/labs/reviews')).length,40)
  assert.equal(designSeeds.length,30)
  const activeDesigns=await send(client,'/design-scenarios')
  assert.equal(activeDesigns.filter(s=>designSeeds.some(seed=>seed.slug===s.slug)).length,30)
  const activeProjects=await send(client,'/labs/project/scenarios')
  assert.equal(activeProjects.length,25)
  for(const p of projects){
    const found=activeProjects.find(x=>x.slug===p.slug)
    assert(found && found.questions.length===p.questions.length,p.slug)
  }
  const activePresets=await send(client,'/interview-presets')
  assert.equal(activePresets.length,25)
  const sessions=new Map()
  for(const p of presets){
    const session=await send(client,'/interviews','POST',{
      id:randomUUID(),preset:p.id,level:p.targetLevel,topics:[],language:'en',
      minutes:p.minutes,mode:'mock',count:3,aiConsent:false,aiLimit:0
    },[201])
    assert.equal(session.session.presetName,p.name)
    assert.equal(session.count,3)
    assert.equal(session.current.reference,undefined)
    assert(p.suggested.includes(session.current.slug),p.id)
    sessions.set(session.session.id,p.name)
    await send(client,'/interviews/'+session.session.id+'/actions','POST',{id:randomUUID(),revision:session.revision,action:'end'})
  }
  const history=await send(client,'/history?kind=interview')
  for(const [id,name] of sessions)assert.equal(history.items.find(item=>item.id.toLowerCase()===id.toLowerCase())?.label,name)
  const admin=await browser.newContext({baseURL})
  try{
    await send(admin.request,'/auth/login','POST',{email:process.env.IP_ADMIN_EMAIL,password:process.env.IP_ADMIN_PASSWORD})
    for(const [kind,items] of [['exercise',exercises],['review',reviewCases],['design',designs],['preset',presets]]){
      for(const item of items){
        const slug=item.slug??item.id,path='/admin/materials/'+kind+'/'+slug
        const existing=await send(admin.request,path)
        const draft=await send(admin.request,path,'PUT',{revision:existing.latest,content:existing.content})
        assert.equal(draft.version,existing.latest+1,slug)
        const saved=await send(admin.request,path)
        assert.equal(saved.published,false,slug)
      }
    }
  }finally{await admin.close()}
  await page.goto('/phong-van?preset='+presets[0].id)
  const chooser=page.getByRole('combobox',{name:'Bộ phỏng vấn',exact:true})
  await chooser.selectOption(presets.find(p=>p.minutes===30).id)
  await page.getByRole('combobox',{name:'Thời lượng',exact:true}).waitFor()
  assert.equal(await page.getByRole('combobox',{name:'Thời lượng',exact:true}).inputValue(),'30')
  assert.equal(await chooser.locator('option').count(),25)
  for(const width of [360,390,768,1024,1440,1920]){
    await page.setViewportSize({width,height:width<700?844:960})
    for(const theme of ['light','dark']){
      const toggle=page.getByRole('button',{name:theme==='light'?'Dùng giao diện sáng':'Dùng giao diện tối',exact:true})
      if(await toggle.count())await toggle.click()
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
      await page.screenshot({path:resolve(screenshots,'v4-presets-'+width+'-'+theme+'.png'),animations:'disabled'})
    }
  }
}
