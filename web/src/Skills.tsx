import { useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { SignInGate, useSession } from './session'
import { label, labels } from './types'
import { Badge, Button, Field, Link, Loading, Options, PageTitle, Problem, navigate } from './ui'

type SkillNode={slug:string;title:string;version:number;mastery?:string;verifiedDays:number;aiAssessed:boolean;prerequisites:string[]}
type SkillTopic={id:string;name:string;check:string;exercise?:{kind:string;slug:string;title:string};nodes:SkillNode[]}
export function Skills(){
  const {user,goal}=useSession()
  const tree=useResource<SkillTopic[]>(user?'/skills/tree':null)
  const [topic,setTopic]=useState('csharp')
  const [level,setLevel]=useState(['intern','fresher','junior'].includes(goal.level??'')?goal.level!:'junior')
  const action=useAction(), startId=useRef(crypto.randomUUID())
  const nodes=new Map(tree.data?.flatMap(t=>t.nodes.map(n=>[n.slug,n] as const)))
  const current=tree.data?.find(t=>t.id===topic)
  return <div className="page narrow"><PageTitle title="Cây kỹ năng" back={['/lo-trinh','Lộ trình học']}/>
    {!user?<SignInGate detail="Đăng nhập để xem bằng chứng theo kỹ năng và làm bài kiểm tra đầu vào."/>:<>
    <section className="panel content-panel stack"><h2>Kiểm tra đầu vào</h2><p>Bốn câu về kiến thức nền, đọc code, SQL và xử lý tình huống. Bài code bổ sung xuất hiện khi worker sẵn sàng.</p>
      <Field label="Mức mục tiêu"><select value={level} onChange={e=>{setLevel(e.target.value);startId.current=crypto.randomUUID()}}>
        {['intern','fresher','junior'].map(k=><option key={k} value={k}>{label('level',k)}</option>)}</select></Field>
      <Button tone="primary" disabled={action.busy} onClick={()=>void action.run(async()=>{
        const next=await api<{id:string}>('/placement',{method:'POST',body:{id:startId.current,level}});navigate('/phien-hoc/'+next.id)
      })}>Bắt đầu kiểm tra <ArrowRight size={16}/></Button><Problem text={action.error}/></section>
    <section className="panel content-panel stack"><Field label="Nhóm kỹ năng"><select value={topic} onChange={e=>setTopic(e.target.value)}><Options values={labels.topics}/></select></Field>
      {tree.loading && <Loading/>}<Problem text={tree.error} retry={tree.reload}/>
      {current && <><h2>{current.name}</h2><p>{current.check}</p>
        <p className="small muted">{current.nodes.filter(n=>n.verifiedDays>0).length}/{current.nodes.length} câu có bằng chứng độc lập hiện tại</p>
        {current.exercise && <Link className="text-link" href={'/'+current.exercise.kind+'/'+current.exercise.slug}>Bài áp dụng · {current.exercise.title}</Link>}
        {current.nodes.map(n=><details className="details" key={n.slug}><summary>{n.title} · {label('mastery',n.mastery??'new')}</summary>
          <div className="stack"><span>{n.verifiedDays} ngày kiểm chứng{n.aiAssessed?' · Đã được AI nhận xét':''}</span>
            {n.prerequisites.length>0?<div><strong>Tiên quyết</strong><ul>{n.prerequisites.map(p=><li key={p}>
              {nodes.has(p)?<Link href={'/cau-hoi/'+p}>{nodes.get(p)!.title}</Link>:p}{nodes.get(p)?.verifiedDays===0 && <span> · Chưa kiểm chứng</span>}</li>)}</ul></div>
              :<Badge>Nền tảng</Badge>}
            <Link className="text-link" href={'/cau-hoi/'+n.slug}>Luyện câu này <ArrowRight size={14}/></Link></div>
        </details>)}</>}
    </section></>}</div>
}
