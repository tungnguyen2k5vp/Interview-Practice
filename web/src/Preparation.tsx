import { useRef, useState } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import { useResource } from './api'
import { useSession } from './session'
import type { Dashboard } from './types'
import { ActionLink, Button, Field, Link, PageTitle, Problem } from './ui'

const skills: [string, string, RegExp][] = [
  ['C#', 'csharp', /c#|csharp/i], ['ASP.NET Core', 'aspnet', /asp\.?net|web api/i],
  ['EF Core', 'efcore', /entity framework|\bef\s?core\b/i], ['SQL Server', 'sql', /\bsql\b|t-sql/i],
  ['LINQ', 'linq', /\blinq\b/i], ['Async', 'linq', /\basync|concurrency|đa luồng/i],
  ['OOP / SOLID', 'oop', /\boop\b|\bsolid\b/i], ['Testing', 'testing', /\btest(s|ing)?\b|xunit|nunit/i],
  ['Redis', 'systems', /\bredis\b/i], ['Message queue', 'systems', /kafka|rabbitmq|message queue|service bus/i],
  ['Docker', 'delivery', /\bdocker\b|container/i], ['CI/CD', 'delivery', /ci\s*\/\s*cd|pipeline|github actions/i],
  ['Thuật toán', 'algorithms', /algorithm|thuật toán|data structure/i],
]

export function Preparation() {
  const { user } = useSession()
  const [cv, setCv] = useState('')
  const [jd, setJd] = useState('')
  const [project, setProject] = useState('')
  const [done, setDone] = useState<string[]>([])
  const [error, setError] = useState('')
  const upload = useRef(0)
  const matched = skills.filter(([, , re]) => re.test(jd) || re.test(cv))
  const topics = [...new Set(matched.map(([, topic]) => topic))]
  const progress = useResource<Dashboard>(user && topics.length ? '/dashboard' : null)
  const projects = [...new Set([...cv.matchAll(/^(?:dự án|project)\s*[:–-]\s*(.{2,100})$/gimu)].slice(0, 5).map(m => m[1].trim()))]
  const chosen = project || projects[0] || ''
  function clear() { upload.current++; setCv(''); setJd(''); setProject(''); setDone([]); setError('') }
  async function read(file?: File) {
    const revision = ++upload.current
    if (!file) return
    setError('')
    if (!/\.txt$/i.test(file.name) || (file.type && file.type !== 'text/plain') || file.size === 0 || file.size > 65536) {
      setError('Chọn tệp .txt UTF-8 từ 1 byte đến 64 KB.'); return
    }
    try {
      const text = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer())
      if (!text.trim() || text.length > 32000 || Array.from(text).some(c => c.charCodeAt(0) < 32 && !'\t\r\n'.includes(c))) throw new Error()
      if (revision === upload.current) { setCv(text); setProject(''); setDone([]) }
    } catch { if (revision === upload.current) setError('Tệp cần chứa văn bản UTF-8, tối đa 32.000 ký tự.') }
  }
  return <div className="page narrow">
    <PageTitle title="Chuẩn bị theo CV và JD" back={['/phong-van','Phỏng vấn thử']} description="Văn bản chỉ nằm trong trang đang mở. Khi tạo phiên, ứng dụng dùng các chủ đề bạn đã chọn."/>
    <div className="setup-grid"><section className="panel content-panel stack">
      <Field label="CV của bạn"><textarea rows={7} maxLength={32000} value={cv} placeholder="Dán kinh nghiệm, kỹ năng và các dòng Dự án: …"
        onChange={e => { upload.current++; setCv(e.target.value); setProject(''); setDone([]) }}/></Field>
      <Field label="Đọc CV từ tệp .txt"><input type="file" accept=".txt,text/plain" onChange={e => { const f=e.target.files?.[0]; e.target.value=''; void read(f) }}/></Field>
    </section><section className="panel content-panel stack">
      <Field label="Mô tả công việc (JD)"><textarea rows={7} maxLength={32000} value={jd} placeholder="Dán yêu cầu của vị trí ứng tuyển" onChange={e => { setJd(e.target.value); setDone([]) }}/></Field>
      <Button onClick={clear} disabled={!cv && !jd && !error}><Trash2 size={16}/> Xóa CV và JD</Button>
    </section></div><Problem text={error}/>
    {(cv || jd) && <section className="panel content-panel stack"><h2>Checklist chuẩn bị</h2>
      {!matched.length && <p className="muted">Chưa nhận diện được kỹ năng thuộc ngân hàng câu hỏi. Bạn có thể chọn chủ đề ở màn hình thiết lập phiên.</p>}
      {matched.map(([name,topic,re]) => <div className="split" key={name}><label className="check-chip">
        <input type="checkbox" checked={done.includes(name)} onChange={e => setDone(e.target.checked ? [...done,name] : done.filter(k=>k!==name))}/>{name}</label>
        <span className="small muted">{re.test(jd) ? re.test(cv) ? 'Có trong JD và CV' : 'JD yêu cầu · CV chưa đề cập' : 'Có trong CV'}</span>
        <Link className="text-link" href={'/cau-hoi?topic='+topic}>Luyện chủ đề <ArrowRight size={14}/></Link></div>)}
      {topics.length > 0 && <ActionLink tone="primary" href={'/phong-van?preset=backend&topics='+encodeURIComponent(topics.join(','))}>Tạo phiên theo kỹ năng <ArrowRight size={15}/></ActionLink>}
    </section>}
    {progress.data && <section className="panel content-panel stack"><h2>Bằng chứng luyện theo yêu cầu công việc</h2>
      {progress.data.topics.filter(row => topics.includes(row.topic)).map(row => <div className="split" key={row.topic}>
        <Link className="text-link" href={'/cau-hoi?topic=' + row.topic}>{skills.filter(([,topic,re])=>topic===row.topic && (re.test(jd)||re.test(cv))).map(([name])=>name).join(' · ')}</Link>
        <span className="small">{row.practicedQuestions === 0 ? 'Chưa có lượt tự trả lời' : row.practicedQuestions + ' câu đã luyện · ' + row.confidentQuestions + ' câu khá vững hoặc thành thạo'}</span>
      </div>)}
      <Link className="text-link" href="/lo-trinh">Mở lịch chuẩn bị phỏng vấn <ArrowRight size={15}/></Link>
    </section>}
    <Problem text={progress.error} retry={progress.reload}/>
    {projects.length > 0 && <section className="panel content-panel stack"><Field label="Dự án từ CV"><select value={chosen} onChange={e=>setProject(e.target.value)}>
      {projects.map(p=><option key={p}>{p}</option>)}</select></Field>
      <h2>Câu hỏi về dự án</h2><ul><li>Trong dự án “{chosen}”, phần nào do bạn trực tiếp chịu trách nhiệm?</li>
      <li>Bạn đã so sánh những phương án nào trước khi quyết định?</li><li>Bằng chứng nào cho thấy thay đổi của bạn có tác dụng?</li></ul></section>}
  </div>
}
