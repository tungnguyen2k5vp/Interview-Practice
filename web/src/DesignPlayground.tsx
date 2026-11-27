import {useRef,useState} from 'react'
import type {PointerEvent} from 'react'
import {Download,Plus,Save,Trash2} from 'lucide-react'
import {localGet,localSet,useResource} from './api'
import {useSession} from './session'
import {Button,Field,Loading,PageTitle,Problem} from './ui'

type Scenario={slug:string;version:number;title:string;brief:string;requirements:string[];rubric:string[]}
type Part={id:string;kind:string;name:string;x:number;y:number;note:string}
type Flow={from:string;to:string;label:string}
type Diagram={nodes:Part[];flows:Flow[];answers:string[]}
const kinds=['Client','Load Balancer','API Gateway','Application Service','SQL Database','NoSQL Database','Cache','Message Queue','Background Worker','Object Storage','CDN']
const criteria=['Luồng dữ liệu','Nhất quán','Mở rộng','Xử lý lỗi','Bảo mật']
const W=880,H=420,NW=156,NH=52
const clamp=(v:number,max:number)=>Math.max(0,Math.min(Math.round(v),max))
const empty=():Diagram=>({nodes:[],flows:[],answers:criteria.map(()=>'')})
const keyOf=(s:Scenario)=>s.slug+'@'+s.version

function valid(d:Diagram|null): d is Diagram {
  if(!d || !Array.isArray(d.nodes)||d.nodes.length>32||!Array.isArray(d.flows)||d.flows.length>64||!Array.isArray(d.answers)||d.answers.length!==5)return false
  const ids=new Set(d.nodes.map(n=>n?.id))
  return ids.size===d.nodes.length && d.nodes.every(n=>n && typeof n.id==='string' && n.id.length<=64 && kinds.includes(n.kind) &&
    typeof n.name==='string' && n.name.length<=40 && typeof n.note==='string' && n.note.length<=800 &&
    Number.isInteger(n.x) && n.x===clamp(n.x,W-NW) && Number.isInteger(n.y) && n.y===clamp(n.y,H-NH)) &&
    d.flows.every(f=>f && f.from!==f.to && ids.has(f.from) && ids.has(f.to) && typeof f.label==='string' && f.label.length<=80) &&
    d.answers.every(a=>typeof a==='string' && a.length<=2000)
}

export function DesignPlayground(){
  const catalog=useResource<Scenario[]>('/design-scenarios')
  const {user}=useSession()
  const [choice,setChoice]=useState('')
  const scenarios=catalog.data??[]
  const scenario=scenarios.find(s=>keyOf(s)===choice)??scenarios.filter(s=>s.slug==='url-shortener').sort((a,b)=>b.version-a.version)[0]??scenarios[0]
  return <div className="page"><PageTitle title="Thiết kế hệ thống" back={['/thuc-hanh','Phỏng vấn thực hành']}/>
    {catalog.loading && <Loading/>}<Problem text={catalog.error} retry={catalog.reload}/>
    {scenario && <><Field label="Tình huống thiết kế"><select value={keyOf(scenario)} onChange={e=>setChoice(e.target.value)}>
      {scenarios.map(s=><option key={keyOf(s)} value={keyOf(s)}>{s.title} · v{s.version}</option>)}</select></Field>
      <Board key={(user?.id??'guest')+keyOf(scenario)} scenario={scenario} owner={user?.id??'guest'}/></>}
  </div>
}

function Board({scenario,owner}:{scenario:Scenario;owner:string}){
  const storage='ip:'+owner+':design:'+keyOf(scenario)
  const [diagram,setDiagram]=useState<Diagram>(()=>{const d=localGet<Diagram>(storage);return valid(d)?d:empty()})
  const [kind,setKind]=useState(kinds[0]),[selected,select]=useState(diagram.nodes[0]?.id??'')
  const [destination,setDestination]=useState(''),[label,setLabel]=useState(''),[notice,setNotice]=useState('')
  const [assessment,setAssessment]=useState(false)
  const svg=useRef<SVGSVGElement>(null)
  const drag=useRef<{id:string;dx:number;dy:number}|null>(null)
  const part=diagram.nodes.find(n=>n.id===selected)
  const targets=diagram.nodes.filter(n=>n.id!==selected && !diagram.flows.some(f=>f.from===selected && f.to===n.id))
  const target=targets.find(n=>n.id===destination)??targets[0]
  function update(next:Diagram){
    setDiagram(next)
    setNotice(localSet(storage,next)?'Đã lưu sơ đồ trên thiết bị.':'Thiết bị không cho phép lưu. Hãy xuất sơ đồ trước khi rời trang.')
  }
  function edit(id:string,changes:Partial<Part>){update({...diagram,nodes:diagram.nodes.map(n=>n.id===id?{...n,...changes}:n)})}
  function add(){
    const index=diagram.nodes.length
    const n={id:crypto.randomUUID(),kind,name:kind,note:'',x:24+(index%4)*205,y:32+(Math.floor(index/4)%4)*90}
    update({...diagram,nodes:[...diagram.nodes,n]});select(n.id)
  }
  function point(e:PointerEvent){
    const matrix=svg.current?.getScreenCTM()
    return matrix?new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()):null
  }
  function finishDrag(e:PointerEvent){
    if(!drag.current)return
    const p=point(e),d=drag.current;drag.current=null
    if(p)edit(d.id,{x:clamp(p.x-d.dx,W-NW),y:clamp(p.y-d.dy,H-NH)})
  }
  function download(){
    if(!svg.current)return
    const xml=svg.current.cloneNode(true) as SVGSVGElement
    xml.setAttribute('xmlns','http://www.w3.org/2000/svg')
    const style=document.createElementNS(xml.namespaceURI,'style')
    style.textContent='svg{background:white;font:14px sans-serif}.part rect{fill:#edf4ef;stroke:#23634b}.part text,.flow-label{fill:#192c27}.part-type{font-size:10px}.flow{stroke:#52685c;stroke-width:2}.arrow{fill:#52685c}.flow-label{font-size:11px;paint-order:stroke;stroke:white;stroke-width:4px}'
    xml.prepend(style)
    const desc=document.createElementNS(xml.namespaceURI,'desc')
    desc.textContent=JSON.stringify({scenario:scenario.title,version:scenario.version,requirements:scenario.requirements,diagram})
    xml.prepend(desc)
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(xml)],{type:'image/svg+xml'}))
    const a=document.createElement('a');a.href=url;a.download=scenario.slug+'-v'+scenario.version+'.svg';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  const isolated=diagram.nodes.filter(n=>!diagram.flows.some(f=>f.from===n.id||f.to===n.id))
  return <><div className="design-brief"><h2>{scenario.title}</h2><p>{scenario.brief}</p><ul>{scenario.requirements.map(r=><li key={r}>{r}</li>)}</ul></div>
    <section className="panel content-panel stack"><div className="split"><h2>Sơ đồ kiến trúc</h2><Button disabled={!diagram.nodes.length} onClick={download}><Download size={16}/> Xuất SVG</Button></div>
      <div className="action-row"><Field label="Loại thành phần"><select value={kind} onChange={e=>setKind(e.target.value)}>{kinds.map(k=><option key={k}>{k}</option>)}</select></Field>
        <Button tone="primary" disabled={diagram.nodes.length>=32} onClick={add}><Plus size={16}/> Thêm vào sơ đồ</Button></div>
      <div className="design-scroll" tabIndex={0} role="region" aria-label="Vùng sơ đồ cuộn ngang"><svg className="design-board" viewBox={'0 0 '+W+' '+H} ref={svg} aria-label={'Sơ đồ '+scenario.title}
        onPointerMove={e=>{const d=drag.current,p=point(e);if(!d||!p)return
          setDiagram(old=>({...old,nodes:old.nodes.map(n=>n.id===d.id?{...n,x:clamp(p.x-d.dx,W-NW),y:clamp(p.y-d.dy,H-NH)}:n)}))}}
        onPointerUp={finishDrag} onPointerCancel={()=>{if(drag.current){drag.current=null;update(diagram)}}}>
        <title>Sơ đồ {scenario.title}</title><defs><marker id="flow-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path className="arrow" d="M0,0 L8,4 L0,8 Z"/></marker></defs>
        {diagram.flows.map(f=>{const a=diagram.nodes.find(n=>n.id===f.from)!,b=diagram.nodes.find(n=>n.id===f.to)!
          const dx=b.x-a.x,dy=b.y-a.y,scale=Math.min(NW/2/(Math.abs(dx)||0.001),NH/2/(Math.abs(dy)||0.001),0.5)
          const x=a.x+NW/2,y=a.y+NH/2
          return <g key={a.id+b.id}><line className="flow" x1={x+dx*scale} y1={y+dy*scale} x2={b.x+NW/2-dx*scale} y2={b.y+NH/2-dy*scale} markerEnd="url(#flow-arrow)"/>
            <title>{f.label}</title></g>})}
        {diagram.nodes.map(n=><g key={n.id} transform={'translate('+n.x+' '+n.y+')'} className={'part'+(n.id===selected?' selected':'')} tabIndex={0} role="button"
          aria-label={n.name+', '+n.kind+', vị trí '+n.x+', '+n.y} aria-pressed={n.id===selected} onFocus={()=>select(n.id)} onPointerDown={e=>{if(e.button!==0)return;const p=point(e);if(!p)return
            e.currentTarget.setPointerCapture(e.pointerId);select(n.id);drag.current={id:n.id,dx:p.x-n.x,dy:p.y-n.y}}}
          onKeyDown={e=>{const delta:Record<string,[number,number]>={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}
            if(e.key==='Enter'||e.key===' '){e.preventDefault();select(n.id)}
            else if(delta[e.key]){e.preventDefault();const x=clamp(n.x+delta[e.key][0],W-NW),y=clamp(n.y+delta[e.key][1],H-NH)
              edit(n.id,{x,y});setNotice(n.name+' · Vị trí '+x+', '+y+'.')}}}>
          <title>{n.name}{n.note?' · '+n.note:''}</title><rect width={NW} height={NH} rx="7"/><text x="10" y="22">{n.name.length>17?n.name.slice(0,16)+'…':n.name}</text><text className="part-type" x="10" y="40">{n.kind}</text>
        </g>)}
        {diagram.flows.map(f=>{const a=diagram.nodes.find(n=>n.id===f.from)!,b=diagram.nodes.find(n=>n.id===f.to)!
          return <text key={f.from+f.to} className="flow-label" x={(a.x+b.x+NW)/2} y={Math.max(14,Math.min(a.y,b.y)-5)} textAnchor="middle">{f.label.slice(0,25)}</text>})}
        {!diagram.nodes.length && <text x="24" y="52">Thêm thành phần đầu tiên.</text>}
      </svg></div>
      <p className="small muted">Kéo thành phần hoặc chọn rồi dùng phím mũi tên để di chuyển.</p>
      {part && <div className="form-grid"><Field label="Thành phần đang chỉnh"><select value={selected} onChange={e=>select(e.target.value)}>{diagram.nodes.map((n,i)=><option key={n.id} value={n.id}>{i+1}. {n.name}</option>)}</select></Field>
        <Field label="Tên trên sơ đồ"><input maxLength={40} value={part.name} onChange={e=>edit(part.id,{name:e.target.value})}/></Field>
        <Field label="Ghi chú và đánh đổi" full><textarea rows={2} maxLength={800} value={part.note} onChange={e=>edit(part.id,{note:e.target.value})}/></Field>
        {targets.length>0 && <><Field label="Nối tới"><select value={target.id} onChange={e=>setDestination(e.target.value)}>{targets.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></Field>
          <Field label="Dữ liệu truyền"><input value={label} maxLength={80} onChange={e=>setLabel(e.target.value)} placeholder="Ví dụ: yêu cầu giữ chỗ"/></Field></>}
        <div className="action-row span-all">{target && <Button disabled={!label.trim()||diagram.flows.length>=64} onClick={()=>{update({...diagram,flows:[...diagram.flows,{from:part.id,to:target.id,label:label.trim()}]});setLabel('')}}>Nối thành phần</Button>}
          <Button onClick={()=>{const nodes=diagram.nodes.filter(n=>n.id!==part.id);update({...diagram,nodes,flows:diagram.flows.filter(f=>f.from!==part.id&&f.to!==part.id)});select(nodes[0]?.id??'')}}><Trash2 size={15}/> Xóa thành phần</Button></div></div>}
      {diagram.flows.map(f=><div className="split" key={f.from+f.to}><span>{diagram.nodes.find(n=>n.id===f.from)?.name} → {diagram.nodes.find(n=>n.id===f.to)?.name} · {f.label}</span>
        <Button onClick={()=>update({...diagram,flows:diagram.flows.filter(edge=>edge!==f)})}>Xóa kết nối</Button></div>)}
      <span className="small muted" role="status">{notice}</span>
    </section>
    <section className="panel content-panel stack"><h2>Bảo vệ phương án</h2>{scenario.rubric.map((prompt,i)=><Field key={i} label={criteria[i]+' · '+prompt}>
      <textarea rows={2} maxLength={2000} value={diagram.answers[i]} onChange={e=>update({...diagram,answers:diagram.answers.map((a,j)=>i===j?e.target.value:a)})}/></Field>)}
      <Button onClick={()=>setAssessment(true)}><Save size={15}/> Đối chiếu thiết kế</Button>
      {assessment && <div role="status" className="stack"><strong>{diagram.nodes.length} thành phần · {diagram.flows.length} luồng dữ liệu</strong>
        <p>{!diagram.nodes.length?'Thêm điểm bắt đầu cho một yêu cầu.':isolated.length?'Kiểm tra thành phần chưa kết nối: '+isolated.map(n=>n.name).join(', ')+'.':'Mỗi thành phần có ít nhất một kết nối.'}</p>
        <p>{diagram.answers.every(a=>a.trim())?'Đã ghi lập luận cho cả năm tiêu chí. Đối chiếu từng yêu cầu của đề với luồng tương ứng.':'Cần bổ sung lập luận: '+criteria.filter((_,i)=>!diagram.answers[i].trim()).join(', ')+'.'}</p></div>}
    </section></>
}
