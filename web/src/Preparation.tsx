import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import { localGet, localSet, useResource } from './api'
import { useSession } from './session'
import type { Dashboard } from './types'
import { ActionLink, Button, Field, Link, PageTitle, Problem } from './ui'

const skills: [string, string, RegExp][] = [
  ['C#', 'csharp', /c#|csharp/i], ['ASP.NET Core', 'aspnet', /asp\.?net|web api/i],
  ['EF Core', 'efcore', /entity framework|\bef\s?core\b/i], ['SQL Server', 'sql', /\bsql\b|t-sql/i],
  ['LINQ', 'linq', /\blinq\b/i], ['Async / concurrency', 'csharp', /\basync|\bawait|concurrency|đa luồng/i],
  ['OOP / SOLID', 'oop', /\boop\b|\bsolid\b/i], ['Testing', 'testing', /\btest(s|ing)?\b|xunit|nunit/i],
  ['Redis', 'systems', /\bredis\b/i], ['Message queue', 'systems', /kafka|rabbitmq|message queue|service bus/i],
  ['Docker', 'delivery', /\bdocker\b|container/i], ['CI/CD', 'delivery', /ci\s*\/\s*cd|pipeline|github actions/i],
  ['Thuật toán', 'algorithms', /algorithm|thuật toán|data structure/i],
]

type SavedPrep = {cv:string;jd:string;done:string[]}
type Target = 'cv' | 'jd'
function requirements(jd:string, re:RegExp) {
  let optional=false, found=false
  for(const line of jd.split(/[\n;]/)){
    if(/nice.to.have|preferred|ưu tiên|lợi thế|điểm cộng|desirable/i.test(line))optional=true
    else if(/required|must.have|requirements|bắt buộc|yêu cầu/i.test(line))optional=false
    if(re.test(line)){if(!optional)return 'required';found=true}
  }
  return found?'optional':''
}

export function Preparation() {
  const { user,goal } = useSession()
  const storageKey='ip:'+(user?.id??'guest')+':preparation'
  const [cv, setCv] = useState('')
  const [jd, setJd] = useState('')
  const [project, setProject] = useState('')
  const [done, setDone] = useState<string[]>([])
  const [error, setError] = useState('')
  const [preview,setPreview]=useState<{target:Target;text:string;name:string}>()
  const [loading,setLoading]=useState(false)
  const [notice,setNotice]=useState('')
  const [saved,setSaved]=useState(()=>Boolean(localGet<SavedPrep>(storageKey)))
  const upload=useRef<AbortController|null>(null)
  useEffect(()=>()=>upload.current?.abort(),[])
  const matched = skills.filter(([, , re]) => re.test(jd) || re.test(cv))
  const topics = [...new Set(matched.map(([, topic]) => topic))]
  const progress = useResource<Dashboard>(user && topics.length ? '/dashboard' : null)
  const projects = [...new Set([...cv.matchAll(/^(?:dự án|project|experience|kinh nghiệm|vị trí|role)\s*[:–-]\s*(.{2,130})$/gimu)].slice(0, 8).map(m => m[1].trim()))]
  const chosen = project || projects[0] || ''
  const today=progress.data?.today
  const daysToInterview=goal.interviewDate && today ? Math.round((Date.parse(goal.interviewDate)-Date.parse(today))/86400000) : null
  const gaps=matched.filter(([,topic,re])=>requirements(jd,re)==='required' && !progress.data?.topics.find(t=>t.topic===topic)?.confidentQuestions)
  function cancel(){upload.current?.abort();setLoading(false);setPreview(undefined)}
  function clear() { cancel(); setCv(''); setJd(''); setProject(''); setDone([]);setNotice('');setError('')
    if(localSet(storageKey,null))setSaved(false);else setError('Không xóa được bản lưu trên thiết bị.') }
  async function read(target:Target,file?: File) {
    cancel()
    if (!file) return
    const controller=new AbortController();upload.current=controller
    setError('');setLoading(true);setNotice('')
    try {
      const {extractText}=await import('./documentText')
      const text=await extractText(file,controller.signal)
      if(!controller.signal.aborted)setPreview({target,text,name:file.name})
    } catch(e){if(!controller.signal.aborted)setError(e instanceof Error && !/password|invalid|decode|abort|worker/i.test(e.message)?e.message:'Chưa đọc được văn bản. Kiểm tra định dạng, mật khẩu hoặc dán nội dung.')}
    finally{if(!controller.signal.aborted)setLoading(false)}
  }
  const fileInput=(target:Target)=><Field label={'Đọc '+target.toUpperCase()+' từ TXT, PDF hoặc DOCX'}><input type="file" accept=".txt,.pdf,.docx"
    onChange={e=>{const f=e.target.files?.[0];e.target.value='';void read(target,f)}}/></Field>
  return <div className="page narrow">
    <PageTitle title="Chuẩn bị theo CV và JD" back={['/phong-van','Phỏng vấn thử']} description="Tệp được đọc trên thiết bị. Khi tạo phiên phỏng vấn, ứng dụng chỉ sử dụng các chủ đề bạn đã chọn."/>
    <div className="setup-grid"><section className="panel content-panel stack">
      <Field label="CV của bạn"><textarea rows={7} maxLength={32000} value={cv} placeholder="Dán kinh nghiệm, kỹ năng và các dòng Dự án: …"
        onChange={e => { cancel(); setCv(e.target.value); setProject(''); setDone([]) }}/></Field>
      {fileInput('cv')}
    </section><section className="panel content-panel stack">
      <Field label="Mô tả công việc (JD)"><textarea rows={7} maxLength={32000} value={jd} placeholder="Dán yêu cầu của vị trí ứng tuyển" onChange={e => { cancel();setJd(e.target.value); setDone([]) }}/></Field>
      {fileInput('jd')}
    </section></div><Problem text={error}/>
    {loading && <p role="status">Đang đọc tài liệu trên thiết bị…</p>}
    {preview && <section className="panel content-panel stack"><h2>Xác nhận nội dung trích xuất</h2><p>{preview.name}</p>
      <Field label="Văn bản trích xuất"><textarea rows={8} maxLength={32000} value={preview.text} onChange={e=>setPreview({...preview,text:e.target.value})}/></Field>
      <div className="action-row"><Button tone="primary" disabled={!preview.text.trim()} onClick={()=>{(preview.target==='cv'?setCv:setJd)(preview.text.trim());setDone([]);setProject('');setPreview(undefined)}}>Dùng nội dung này</Button>
      <Button onClick={()=>setPreview(undefined)}>Bỏ bản trích xuất</Button></div></section>}
    <div className="action-row">{(cv||jd) && <Button onClick={()=>{
      if(localSet(storageKey,{cv,jd,done})){setSaved(true);setNotice('Đã lưu CV, JD và checklist trên thiết bị này.')}else setError('Thiết bị không cho phép lưu.')
    }}>Lưu trên thiết bị</Button>}
    {saved && <Button onClick={()=>{const v=localGet<SavedPrep>(storageKey);if(v && typeof v.cv==='string' && typeof v.jd==='string' && Array.isArray(v.done)){
      cancel();setCv(v.cv.slice(0,32000));setJd(v.jd.slice(0,32000));setDone(v.done.filter(x=>typeof x==='string'));setProject('');setNotice('Đã mở bản lưu trên thiết bị.')
    }}}>Mở bản đã lưu</Button>}
    <Button onClick={clear} disabled={!cv && !jd && !error && !saved && !preview && !loading}><Trash2 size={16}/> Xóa CV và JD</Button></div><span role="status">{notice}</span>
    {(cv || jd) && <section className="panel content-panel stack"><h2>Checklist chuẩn bị</h2>
      {!matched.length && <p className="muted">Chưa nhận diện được kỹ năng thuộc ngân hàng câu hỏi. Bạn có thể chọn chủ đề ở màn hình thiết lập phiên.</p>}
      {matched.map(([name,topic,re]) => <div className="split" key={name}><label className="check-chip">
        <input type="checkbox" checked={done.includes(name)} onChange={e => setDone(e.target.checked ? [...done,name] : done.filter(k=>k!==name))}/>{name}</label>
        <span className="small muted">{requirements(jd,re)==='optional' ? 'Kỹ năng ưu tiên'+(re.test(cv)?' · Có trong CV':' · CV chưa đề cập') : re.test(jd) ? re.test(cv) ? 'Có trong JD và CV' : 'JD yêu cầu · CV chưa đề cập' : 'Có trong CV'}</span>
        <Link className="text-link" href={'/cau-hoi?topic='+topic}>Luyện chủ đề <ArrowRight size={14}/></Link></div>)}
      {topics.length > 0 && <ActionLink tone="primary" href={'/phong-van?preset=backend&topics='+encodeURIComponent(topics.join(','))}>Tạo phiên theo kỹ năng <ArrowRight size={15}/></ActionLink>}
    </section>}
    {progress.data && <section className="panel content-panel stack"><h2>Bằng chứng luyện theo yêu cầu công việc</h2>
      {progress.data.topics.filter(row => topics.includes(row.topic)).map(row => <div className="split" key={row.topic}>
        <Link className="text-link" href={'/cau-hoi?topic=' + row.topic}>{skills.filter(([,topic,re])=>topic===row.topic && (re.test(jd)||re.test(cv))).map(([name])=>name).join(' · ')}</Link>
        <span className="small">{row.practicedQuestions === 0 ? 'Chưa có lượt tự trả lời' : row.practicedQuestions + ' câu đã luyện · ' + row.confidentQuestions + ' câu khá vững hoặc thành thạo'}</span>
      </div>)}
      {daysToInterview!==null && daysToInterview>=0 && <div><h3>Đến ngày phỏng vấn · {goal.interviewDate}</h3><ol>
        <li>Hôm nay · {gaps.length?'Kiểm chứng '+gaps.map(([name])=>name).join(', '):'Ôn lại kỹ năng bắt buộc trong JD'}.</li>
        {daysToInterview>=2 && <li>Trong {Math.max(1,Math.floor(daysToInterview/2))} ngày tới · Luyện một ví dụ có dẫn chứng{chosen?' từ '+chosen:''}.</li>}
        <li>{daysToInterview>0?'Trước buổi phỏng vấn':'Trong hôm nay'} · Chạy một phiên mock theo các kỹ năng đã chọn.</li></ol></div>}
      <Link className="text-link" href="/lo-trinh">Mở lịch chuẩn bị phỏng vấn <ArrowRight size={15}/></Link>
    </section>}
    <Problem text={progress.error} retry={progress.reload}/>
    {projects.length > 0 && <section className="panel content-panel stack"><Field label="Dự án từ CV"><select value={chosen} onChange={e=>setProject(e.target.value)}>
      {projects.map(p=><option key={p}>{p}</option>)}</select></Field>
      <h2>Câu hỏi về dự án</h2><ul><li>Trong dự án “{chosen}”, phần nào do bạn trực tiếp chịu trách nhiệm?</li>
      <li>Bạn đã so sánh những phương án nào trước khi quyết định?</li><li>Bằng chứng nào cho thấy thay đổi của bạn có tác dụng?</li></ul></section>}
  </div>
}
