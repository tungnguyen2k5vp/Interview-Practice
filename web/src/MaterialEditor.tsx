import {useState} from 'react'
import {api,useAction,useResource} from './api'
import {useSession} from './session'
import {Button,Field,Loading,PageTitle,Problem} from './ui'

type Row={slug:string;title:string;latest:number;published?:number}
type Detail={kind:string;slug:string;version:number;latest:number;versions:number[];published:boolean;content:Record<string,unknown>}
const kinds:Record<string,string>={design:'Tình huống thiết kế',review:'Code review',exercise:'Coding, SQL và debugging',preset:'Bộ phỏng vấn',topic:'Nhóm kỹ năng',track:'Lộ trình'}
function download(name:string,data:unknown){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
  const a=document.createElement('a');a.href=url;a.download=name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
async function readJson(f:File){
  if(!f.name.toLowerCase().endsWith('.json')||f.size>204800)throw new Error('Chọn tệp JSON tối đa 200 KiB.')
  try{return JSON.parse(await f.text())}catch{throw new Error('Tệp JSON không hợp lệ.')}
}

export function MaterialEditor(){
  const [kind,setKind]=useState('design'),[key,setKey]=useState(''),[v,setV]=useState(0),[audit,setAudit]=useState(false)
  const root='/admin/materials/'+kind, list=useResource<Row[]>(root)
  const slug=key||list.data?.[0]?.slug
  const detail=useResource<Detail>(slug?root+'/'+encodeURIComponent(slug)+(v?'?version='+v:''):null)
  const events=useResource<{id:number;actor:string;kind:string;slug:string;version:number;action:string;at:string}[]>(audit?'/admin/materials/audit':null)
  function reload(next:string){setKey(next);setV(0);list.reload();detail.reload();events.reload()}
  return <div className="page narrow"><PageTitle title="Biên tập học liệu" back={['/quan-tri','Quản trị câu hỏi']}/>
    <div className="form-grid"><Field label="Loại học liệu"><select value={kind} onChange={e=>{setKind(e.target.value);setKey('');setV(0)}}>
      {Object.entries(kinds).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="Học liệu"><select value={slug??''} onChange={e=>{setKey(e.target.value);setV(0)}}>{list.data?.map(x=><option key={x.slug} value={x.slug}>{x.title}</option>)}</select></Field></div>
    {(list.loading||detail.loading)&&<Loading/>}<Problem text={list.error||detail.error} retry={list.error?list.reload:detail.reload}/>
    {detail.data && <Edit key={kind+slug+detail.data.version} initial={detail.data} saved={reload} pick={setV}/>}
    <details className="panel content-panel" onToggle={e=>setAudit(e.currentTarget.open)}><summary>Nhật ký quản trị</summary>
      {events.loading && <Loading/>}<Problem text={events.error} retry={events.reload}/>
      {events.data?.length===0 && <p>Chưa có thao tác nào được ghi.</p>}{events.data?.map(e=><div className="study-row" key={e.id}><span>
        <strong>{e.slug} · v{e.version}</strong><small>{e.action} · {e.kind} · {new Date(e.at).toLocaleString('vi')} · {e.actor}</small></span></div>)}</details></div>
}
function Edit({initial,saved,pick}:{initial:Detail;saved:(key:string)=>void;pick:(v:number)=>void}){
  const {user}=useSession()
  const storage='ip:'+user?.id+':material:'+initial.kind+':'+initial.slug+':'+initial.version
  const original=JSON.stringify(initial.content,null,2)
  const [recovered]=useState(()=>{
    try {
      const value=JSON.parse(sessionStorage.getItem(storage)??'null')
      return typeof value?.slug==='string' && typeof value?.text==='string' ? value as {slug:string;text:string} : null
    } catch { return null }
  })
  const [slug,setSlug]=useState(recovered?.slug??initial.slug),[text,setText]=useState(recovered?.text??original),[notice,setNotice]=useState('')
  const action=useAction(), root='/admin/materials/'+initial.kind
  function edit(nextSlug:string,nextText:string){
    setSlug(nextSlug);setText(nextText)
    try {
      if(nextSlug===initial.slug && nextText===original)sessionStorage.removeItem(storage)
      else sessionStorage.setItem(storage,JSON.stringify({slug:nextSlug,text:nextText}))
    } catch {setNotice('Không lưu được bản đang sửa trong tab này. Hãy lưu nháp trước khi đổi học liệu.')}
  }
  let preview:Record<string,unknown>|undefined
  try{const data=JSON.parse(text);if(data && typeof data==='object' && !Array.isArray(data))preview=data}catch{/* shown beside the editor */}
  const clone=slug!==initial.slug, changed=text!==original
  const validSlug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=90
  return <section className="panel content-panel stack">
    <div className="form-grid"><Field label="Phiên bản đã lưu"><select value={initial.version} onChange={e=>pick(Number(e.target.value))}>
      {initial.versions.map(n=><option key={n} value={n}>v{n}</option>)}</select></Field>
      <Field label="Slug để lưu hoặc nhân bản"><input maxLength={90} value={slug} readOnly={initial.kind==='topic'} onChange={e=>edit(e.target.value,text)}/></Field></div>
    <p className="small muted">v{initial.version} · {initial.published?'Đã xuất bản':'Bản nháp'}. Khi lưu, hệ thống tạo một phiên bản mới.</p>
    <Field label="Nhập nội dung JSON"><input type="file" accept=".json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return
      void readJson(f).then(v=>{setNotice('Đã đọc tệp vào trình biên tập.');edit(slug,JSON.stringify(v,null,2))}).catch(e=>setNotice(e.message))}}/></Field>
    <Field label="Nội dung học liệu"><textarea className="json-source" rows={15} maxLength={140000} value={text} onChange={e=>edit(slug,e.target.value)}/></Field>
    {!preview && <p role="alert">Nhập một đối tượng JSON hợp lệ.</p>}
    {preview && <details className="details"><summary>Xem trước nội dung</summary><h3>{String(preview.title??preview.name??slug)}</h3>
      <p>{String(preview.brief??preview.context??preview.description??preview.check??'')}</p>
      {Object.entries(preview).filter(([k])=>!['title','name','brief','context','description','check'].includes(k)).map(([k,v])=>
        <div key={k}><strong>{k}</strong><pre className="material-value">{typeof v==='string'?v:JSON.stringify(v,null,2)}</pre></div>)}</details>}
    <div className="action-row"><Button tone="primary" disabled={action.busy||!validSlug||!preview||!clone&&(!changed||initial.version!==initial.latest)}
      onClick={()=>void action.run(async()=>{await api(root+'/'+slug,{method:'PUT',body:{revision:clone?0:initial.latest,content:preview}});edit(initial.slug,original);saved(slug)})}>Lưu nháp học liệu</Button>
      {(changed||clone) && <Button disabled={action.busy} onClick={()=>edit(initial.slug,original)}>Khôi phục bản đã lưu</Button>}
      {!initial.published && initial.latest===initial.version && <Button disabled={action.busy||changed||clone} onClick={()=>void action.run(async()=>{
        await api(root+'/'+slug+'/'+initial.version+'/publish',{method:'POST'});saved(slug)
      })}>Xuất bản học liệu v{initial.version}</Button>}
      <Button onClick={()=>download(initial.slug+'-v'+initial.version,initial.content)}>Xuất JSON đã lưu</Button></div>
    {initial.kind==='exercise' && <PrivateTests key={initial.slug+initial.version} exercise={initial}/>}
    <span role="status">{notice}</span><Problem text={action.error}/>
  </section>
}
function PrivateTests({exercise}:{exercise:Detail}){
  const [pack,setPack]=useState<Record<string,unknown>>({}),[cases,setCases]=useState('[]'),[error,setError]=useState('')
  const key=exercise.slug+'@'+exercise.version+'@'+exercise.content.testVersion
  function exportPack(){
    try{
      const rows=JSON.parse(cases)
      if(!Array.isArray(rows)||rows.length<1||rows.length>12)throw new Error()
      for(const row of rows){
        if(exercise.content.kind==='sql'){if(typeof row?.dataset!=='string'||!row.dataset.trim()||row.dataset.length>32000)throw new Error()}
        else{if(typeof row?.input!=='string'||typeof row?.output!=='string'||row.input.length>8000||row.output.length>8000)throw new Error()
          JSON.parse('['+row.input+']');JSON.parse(row.output)}
      }
      download('private-tests',{...pack,[key]:rows});setError('')
    }catch{setError('Cần 1–12 test. Với C# dùng input và output JSON dạng chuỗi. Với SQL dùng dataset.')}
  }
  return <details className="details"><summary>Dataset và test riêng của worker</summary><div className="stack">
    <p>Test công khai và dataset mẫu nằm trong nội dung bài. Gói test ẩn chỉ mở và xuất trên thiết bị này. Khi phát hành, đặt gói trên host worker và kiểm định lời giải.</p>
    <Field label="Mở gói test ẩn hiện có"><input type="file" accept=".json" onChange={e=>{const f=e.target.files?.[0];if(!f)return
      void readJson(f).then(p=>{if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Gói test cần là đối tượng JSON.')
        setPack(p);setCases(JSON.stringify(p[key]??[],null,2));setError('')}).catch(e=>setError(e.message))}}/></Field>
    <Field label={'Test ẩn cho '+key}><textarea className="json-source" rows={4} value={cases} maxLength={120000} onChange={e=>setCases(e.target.value)}/></Field>
    <div className="action-row"><Button onClick={exportPack}>Xuất gói test riêng</Button>
      {exercise.published && <Button onClick={()=>download('exercise-release',[exercise.content])}>Xuất phiên bản cho worker</Button>}</div>
    <Problem text={error}/></div></details>
}
