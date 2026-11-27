import { useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { SignInGate, useSession } from './session'
import { ActionLink, Button, Field, Link, Loading, PageTitle, Problem, Segments, navigate } from './ui'
import type { ExerciseCard } from './types'

type ProjectPrompt = { path:string; line:number; symbol:string; area:string; question:string; check:string }
type ProjectIndex = { fingerprint:string; files:string[]; questions:ProjectPrompt[] }

export function Labs({ mode }: {mode:string}) {
  const { user } = useSession()
  return <div className="page narrow"><PageTitle title="Phỏng vấn thực hành" back={['/phong-van','Phỏng vấn thử']} action={<ActionLink href="/thiet-ke">Thiết kế hệ thống <ArrowRight size={16}/></ActionLink>}/>
    <Segments title="Bài phỏng vấn thực hành" selected={mode} change={v=>navigate('/thuc-hanh?mode='+v)}
      values={[['project','Dự án'],['review','Code review'],['debug','Debugging Lab']]}/>
    {user ? mode==='review' ? <ReviewLab/> : mode==='debug' ? <DebugLab/> : <ProjectInterview/> :
      <SignInGate detail="Đăng nhập để luyện trên mã nguồn và lưu bài review của bạn."/>}</div>
}

type ReviewChoice = {slug:string;version:number;title:string;file:string}
type ReviewAnswer = {id:string;line:number;severity:string;cause:string;repair:string;comment:string;suggestion:string}
type ReviewResult = {input:ReviewAnswer;located:boolean;severityMatches:boolean;causeMatches:boolean;repairMatches:boolean;
  lines:number[];severity:string;cause:string;repair:string;check:string}
type ReviewDiff = ReviewChoice & {context:string;diff:string[];causes:string[];repairs:string[];history:ReviewResult[]}
const severities:Record<string,string> = {moderate:'Vừa',major:'Cao',critical:'Nghiêm trọng'}

function ReviewLab() {
  const catalog=useResource<ReviewChoice[]>('/labs/reviews')
  const [slug,setSlug]=useState('')
  const chosen=catalog.data?.find(c=>c.slug===slug) ?? catalog.data?.[0]
  const path=chosen?'/labs/reviews/'+chosen.slug+'/'+chosen.version:null
  const question=useResource<ReviewDiff>(path)
  return <div className="stack">
    <Field label="Tình huống code review"><select value={chosen?.slug??''} onChange={e=>setSlug(e.target.value)}>
      {catalog.data?.map(c=><option key={c.slug} value={c.slug}>{c.title}</option>)}</select></Field>
    {(catalog.loading || question.loading) && <Loading/>}
    <Problem text={catalog.error || question.error} retry={catalog.error?catalog.reload:question.reload}/>
    {question.data && path && <ReviewWork key={path} question={question.data} path={path}/>}
  </div>
}

function ReviewWork({question:q,path}:{question:ReviewDiff;path:string}) {
  const [line,setLine]=useState(0),[severity,setSeverity]=useState(''),[cause,setCause]=useState(''),[repair,setRepair]=useState('')
  const [comment,setComment]=useState(''),[suggestion,setSuggestion]=useState('')
  const [history,setHistory]=useState(q.history)
  const [show,setShow]=useState(false)
  const action=useAction()
  const last=useRef({id:'',payload:''})
  let number=0
  const lines=q.diff.map(text=>({text,number:text.startsWith('-')?null:++number}))
  function submit(){
    void action.run(async()=>{
      const fields={line,severity,cause,repair,comment:comment.trim(),suggestion:suggestion.trim()}
      const payload=JSON.stringify(fields)
      if(last.current.payload!==payload)last.current={id:crypto.randomUUID(),payload}
      const result=await api<ReviewResult>(path,{method:'POST',body:{...fields,id:last.current.id}})
      setHistory(prev=>[result,...prev.filter(r=>r.input.id!==result.input.id)].slice(0,10));setShow(true)
    })
  }
  return <div className="stack"><section className="panel content-panel stack">
    <h2>{q.title}</h2><p>{q.context}</p>
    <fieldset className="lab-diff"><legend>{q.file} · Chọn dòng cần nhận xét</legend>
      {lines.map((row,i)=><label key={i} data-change={row.text[0]} data-chosen={line===row.number}>
        {row.number!==null?<input type="radio" name="review-line" aria-label={'Dòng '+row.number} checked={line===row.number} onChange={()=>setLine(row.number!)}/>:<span/>}
        <span>{row.number??'−'}</span><code>{row.text}</code></label>)}</fieldset>
    <Field label="Mức độ ảnh hưởng"><select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">Chọn mức độ</option>
      {Object.entries(severities).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field>
    <Field label="Nguyên nhân"><select value={cause} onChange={e=>setCause(e.target.value)}><option value="">Chọn nhận định</option>
      {q.causes.map(v=><option key={v}>{v}</option>)}</select></Field>
    <Field label="Review comment"><textarea value={comment} maxLength={2000} rows={3} onChange={e=>setComment(e.target.value)} placeholder="Điều gì xảy ra với người dùng hoặc dữ liệu?"/></Field>
    <Field label="Hướng xử lý"><select value={repair} onChange={e=>setRepair(e.target.value)}><option value="">Chọn phương án sửa</option>
      {q.repairs.map(v=><option key={v}>{v}</option>)}</select></Field>
    <Field label="Đề xuất thay đổi và cách kiểm tra"><textarea rows={3} maxLength={2000} value={suggestion} onChange={e=>setSuggestion(e.target.value)}/></Field>
    <Button tone="primary" disabled={action.busy||!line||!severity||!cause||!repair||!comment.trim()||!suggestion.trim()} onClick={submit}>Gửi review</Button>
    <Problem text={action.error}/>
  </section>{history.length>0 && <section className="panel content-panel stack"><h2>Review đã gửi</h2>
    {history.map((r,i)=><details className="details" key={r.input.id} open={i===0 && show ? true : undefined}><summary>Dòng {r.input.line} · {severities[r.input.severity]}</summary>
      <p className="written-answer">{r.input.comment}</p><p>{r.input.suggestion}</p><h3>Đối chiếu rubric</h3>
      <ul><li>Vị trí {r.located?'phù hợp':'cần xem lại'} · Dòng {r.lines.join(', ')}</li><li>Mức độ {r.severityMatches?'phù hợp':'cần xem lại'} · {severities[r.severity]}</li>
        <li>Nguyên nhân {r.causeMatches?'phù hợp':'cần xem lại'} · {r.cause}</li><li>Phương án {r.repairMatches?'phù hợp':'cần xem lại'} · {r.repair}</li></ul>
      <p><strong>Tự đối chiếu phần giải thích</strong> · {r.check}</p></details>)}</section>}</div>
}

function DebugLab() {
  const cards=useResource<ExerciseCard[]>('/exercises?kind=coding')
  return <section className="panel content-panel stack"><h2>Sửa lỗi trong editor</h2><p>Tái hiện lỗi bằng starter, sửa code rồi chạy lại cùng đầu vào.</p>
    {cards.loading && <Loading/>}<Problem text={cards.error} retry={cards.reload}/>
    {cards.data?.filter(c=>c.tags.includes('debug-lab')).map(c=><div className="split" key={c.slug}><div><Link className="text-link" href={'/coding/'+c.slug}>{c.title}</Link>
      <p className="muted small">{c.runtime} · {c.minutes} phút</p></div><ActionLink href={'/coding/'+c.slug}>Mở editor</ActionLink></div>)}</section>
}

function ProjectInterview() {
  const [source,setSource] = useState('github')
  const [url,setUrl] = useState('')
  const [file,setFile] = useState<File>()
  const [index,setIndex] = useState<ProjectIndex>()
  const [selected,setSelected] = useState<string[]>([])
  const [analyzed,setAnalyzed] = useState(false)
  const [filter,setFilter] = useState('')
  const [answers,setAnswers] = useState<Record<string,string>>({})
  const [step,setStep] = useState(0)
  const action = useAction()
  function reset() { setIndex(undefined); setSelected([]); setAnalyzed(false); setFilter(''); setAnswers({}); setStep(0) }
  function load(paths:string[]) {
    void action.run(async()=>{
      let result: ProjectIndex
      if(source === 'github') result=await api('/labs/project/github',{method:'POST',body:{url,paths,fingerprint:paths.length?index?.fingerprint:null}})
      else {
        if (!file || !file.size || file.size>2*1024*1024) throw new Error('ZIP')
        const query = new URLSearchParams(paths.map(p=>['path',p]))
        if(paths.length && index)query.set('fingerprint',index.fingerprint)
        result=await api('/labs/project/archive?'+query,{method:'POST',body:file})
      }
      setIndex(result);setAnalyzed(paths.length>0);setStep(0)
      if(!paths.length){setSelected([]);setAnswers({})}
    })
  }
  const files=index?.files.filter(p=>p.toLowerCase().includes(filter.toLowerCase())) ?? []
  const question=index?.questions[step]
  const key=question && [question.path,question.line,question.area].join(':')
  const validFile=file && file.size>0 && file.size<=2*1024*1024
  return <div className="stack">
    <section className="panel content-panel stack"><h2>Mã nguồn dự án</h2>
      <p>Chọn tối đa 12 tệp để luyện theo các dòng mã trong dự án. Máy chủ đọc mã trong bộ nhớ. Phần trả lời chỉ nằm trong trang này.</p>
      <fieldset className="stack lab-inputs" disabled={action.busy}><legend className="sr-only">Nguồn dự án</legend>
        <Segments title="Cách nhập mã nguồn" selected={source} change={v=>{setSource(v);reset()}} values={[['github','GitHub công khai'],['zip','Tệp ZIP']]}/>
        {source==='github' ? <Field label="URL repository GitHub"><input type="url" value={url} placeholder="https://github.com/owner/repo"
          onChange={e=>{setUrl(e.target.value.trim());reset()}}/></Field> :
          <Field label="ZIP mã nguồn · tối đa 2 MiB"><input type="file" accept=".zip,application/zip" onChange={e=>{setFile(e.target.files?.[0]);reset()}}/></Field>}
        {source==='zip' && file && !validFile && <p role="alert">Chọn tệp ZIP có dữ liệu và tối đa 2 MiB.</p>}
        <Button disabled={source==='github' ? !url : !validFile} onClick={()=>load([])}>Đọc danh sách tệp</Button>
      </fieldset>
      <Problem text={action.error}/>{action.busy && <p role="status">Đang đọc mã nguồn…</p>}
    </section>
    {index && <section className="panel content-panel stack"><h2>Phạm vi phân tích</h2>
      {index.files.length ? <><Field label="Lọc đường dẫn"><input type="search" value={filter} onChange={e=>setFilter(e.target.value)}/></Field>
        <fieldset className="lab-files" disabled={action.busy}><legend>Đã chọn {selected.length}/12 tệp</legend>
          {files.map(p=><label key={p}><input type="checkbox" checked={selected.includes(p)} disabled={!selected.includes(p)&&selected.length>=12}
            onChange={e=>{setSelected(e.target.checked?[...selected,p]:selected.filter(x=>x!==p));setAnalyzed(false)}}/>{p}</label>)}
          {!files.length && <p>Không có đường dẫn khớp bộ lọc.</p>}</fieldset>
        <Button tone="primary" disabled={action.busy || !selected.length} onClick={()=>load(selected)}>Tạo câu hỏi từ tệp đã chọn <ArrowRight size={16}/></Button></>:
        <p>Không tìm thấy mã nguồn phù hợp dưới 96 KiB mỗi tệp.</p>}
    </section>}
    {analyzed && <section className="panel content-panel stack"><h2>Phỏng vấn từ mã nguồn</h2>
      {question && key && index ? <><div className="metadata"><strong>{question.area}</strong><span>Câu {step+1}/{index.questions.length}</span></div>
        <p className="prompt-text">{question.question}</p><p className="lab-citation"><code>{question.path}:{question.line}</code> · <code>{question.symbol}</code></p>
        <Field label="Lập luận của bạn"><textarea rows={4} maxLength={6000} value={answers[key]??''} onChange={e=>setAnswers({...answers,[key]:e.target.value})}/></Field>
        <details key={key} className="details"><summary>Tiêu chí tự đối chiếu</summary><p>{question.check}</p></details>
        <div className="action-row"><Button disabled={step===0} onClick={()=>setStep(step-1)}>Câu trước</Button>
          <Button disabled={step+1===index.questions.length} onClick={()=>setStep(step+1)}>Câu sau</Button></div></>:
        <p>Các tệp đã chọn chưa có dấu hiệu đủ rõ để tạo câu hỏi có dẫn dòng. Hãy chọn tệp chứa khai báo lớp, API hoặc truy vấn.</p>}
    </section>}
  </div>
}
