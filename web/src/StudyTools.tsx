import {useEffect,useRef,useState} from 'react'
import {localGet,localSet} from './api'
import type {Reference} from './types'
import {Button,Field,RubricPanel,timeText} from './ui'

const grades=[['again','Luyện lại'],['hard','Khó'],['good','Nhớ được'],['easy','Dễ']]
export function Flashcard({reference,reveal,rate,busy,front}:{reference?:Reference;reveal:()=>void;rate:(r:string)=>void;busy:boolean;front:React.ReactNode}){
  const [back,setBack]=useState(Boolean(reference))
  const area=useRef<HTMLElement>(null)
  const shown=Boolean(back && reference)
  function turn(){if(!reference)reveal();setBack(!shown)}
  return <section ref={area} className="panel content-panel stack flashcard" aria-label="Thẻ ghi nhớ" onKeyDown={e=>{
    if(e.nativeEvent.isComposing || e.ctrlKey || e.altKey || e.metaKey || e.repeat || busy)return
    if(e.code==='Space' && e.target===area.current){e.preventDefault();turn()}
    if(shown && /^[1-4]$/.test(e.key)){e.preventDefault();rate(grades[Number(e.key)-1][0])}
  }} tabIndex={0}>
    <span className="small muted">{shown?'Mặt sau · Đối chiếu':'Mặt trước · Tự nhớ lại'}</span>
    {shown && reference?<RubricPanel reference={reference}/>:front}
    <div><Button tone="primary" disabled={busy} onClick={turn}>{shown?'Xem mặt trước':'Lật thẻ xem đáp án'}</Button></div>
    {shown && <fieldset className="ratings"><legend>Bạn nhớ được đến đâu?</legend><div className="action-row">{grades.map(([r,name],i)=><Button key={r} disabled={busy} onClick={()=>rate(r)}>{i+1} · {name}</Button>)}</div></fieldset>}
    <p className="small muted">Phím cách để lật khi chọn thẻ. Phím 1–4 để tự đánh giá khi đang xem mặt sau.</p>
  </section>
}

export function SpeedClock({storage,expired,ready,onElapsed}:{storage:string;expired:(v:boolean)=>void;ready:(v:boolean)=>void;onElapsed:(v:number)=>void}){
  const [saved]=useState(()=>localGet<{deadline:number;relaxed:boolean}>(storage))
  const [deadline,setDeadline]=useState(saved && Number.isFinite(saved.deadline)?saved.deadline:0)
  const [relaxed,setRelaxed]=useState(saved?.relaxed===true),[now,setNow]=useState(Date.now)
  const seconds=deadline?Math.max(0,Math.min(60,Math.ceil((deadline-now)/1000))):60
  useEffect(()=>{if(!deadline||relaxed)return
    const tick=()=>setNow(Date.now())
    tick();const id=window.setInterval(tick,250);return()=>clearInterval(id)
  },[deadline,relaxed])
  useEffect(()=>{ready(relaxed || deadline>0);expired(!relaxed&&deadline>0&&seconds===0);if(deadline)onElapsed(60-seconds)},[seconds,deadline,expired,ready,onElapsed,relaxed])
  return <div className="stack"><Field label="Hình thức luyện tốc độ"><select disabled={deadline>0} value={relaxed?'relaxed':'timed'} onChange={e=>{const v=e.target.value==='relaxed';setRelaxed(v);localSet(storage,{deadline:0,relaxed:v})}}>
    <option value="timed">Giới hạn 60 giây</option><option value="relaxed">Tự do thời gian</option></select></Field>
    {!relaxed && (deadline?<strong aria-label="Thời gian còn lại">{timeText(seconds)}</strong>:<Button onClick={()=>{const end=Date.now()+60000;setDeadline(end);setNow(Date.now());localSet(storage,{deadline:end,relaxed:false})}}>Bắt đầu 60 giây</Button>)}
    {!relaxed && deadline>0 && seconds===0 && <p role="status" className="notice">Hết 60 giây. Bản nháp đã được giữ lại. Bạn có thể nộp phần đã viết hoặc bỏ qua.</p>}
  </div>
}
