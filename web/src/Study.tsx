import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, ListChecks } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { PracticeRoute } from './Practice'
import { SignInGate, useSession } from './session'
import { label, labels, runStatuses } from './types'
import { ActionLink, Button, Field, Link, Loading, Options, PageTitle, Problem, navigate, shortDate } from './ui'

export const studyModes: Record<string, string> = {
  new: 'Câu mới', due: 'Câu đến hạn', wrong: 'Câu cần luyện lại', weak: 'Chủ đề yếu', core: 'Câu thường gặp',
  flashcard: 'Flashcard', quiz: 'Trắc nghiệm', essay: 'Tự luận', debug: 'Tìm lỗi', predict: 'Dự đoán kết quả',
  compare: 'So sánh khái niệm', speed: 'Trả lời trong 60 giây',
}
type Item = { slug: string; version: number; title: string; minutes: number; topic?:string; attempt?: {
  id: string; outcome: string; correct?: boolean; transfer?:boolean; rating?: string; hintSeen: boolean; answerSeen: boolean; due?: string } }
type Session = { id: string; mode: string; minutes: number; endedAt?: string; items: Item[];level?:string;
  coding?:{slug:string;version:number;submission?:string};codingResult?:{status:string;assisted:boolean} }

export function StudyStart({ initial = 'new' }: { initial?: string }) {
  const { user } = useSession()
  const [mode, setMode] = useState(initial in studyModes ? initial : 'new')
  const [minutes, setMinutes] = useState(10)
  const [topic, setTopic] = useState('')
  const requestId = useRef(crypto.randomUUID())
  const action = useAction()
  return <div className="page narrow">
    <PageTitle title="Phiên học nhanh" back={['/', 'Tổng quan']} />
    {!user ? <SignInGate detail="Đăng nhập để tạo phiên riêng và lưu lịch ôn." /> :
      <form className="panel content-panel stack" onSubmit={e => { e.preventDefault(); void action.run(async () => {
        const session = await api<Session>('/study-sessions', { method: 'POST', body: { id: requestId.current, mode, minutes, topic: topic || null } })
        navigate('/phien-hoc/' + session.id)
      }) }}>
        <fieldset className="ratings"><legend>Bạn có bao nhiêu thời gian?</legend><div className="action-row">{[5, 10, 15, 30].map(value =>
          <Button key={value} tone={minutes === value ? 'primary' : 'secondary'} aria-pressed={value === minutes} onClick={() => setMinutes(value)}>{value} phút</Button>)}</div></fieldset>
        <Field label="Chế độ luyện"><select value={mode} onChange={e => setMode(e.target.value)}><Options values={studyModes} /></select></Field>
        <Field label="Chủ đề"><select value={topic} onChange={e => setTopic(e.target.value)}><option value="">Tất cả chủ đề</option><Options values={labels.topics} /></select></Field>
        <div><Button type="submit" tone="primary" disabled={action.busy}>Bắt đầu phiên <ArrowRight size={16} /></Button></div>
        <Problem text={action.error} />
      </form>}
  </div>
}

export function StudyRoute({ id, params }: { id: string; params: URLSearchParams }) {
  const { user,goal,setGoal } = useSession()
  const resource = useResource<Session>(user ? '/study-sessions/' + encodeURIComponent(id) : null)
  const action = useAction()
  const [finished, setFinished] = useState<Session>()
  const session = finished ?? resource.data
  if (!user) return <SignInGate detail="Đăng nhập để tiếp tục phiên học." />
  if (resource.loading) return <Loading />
  if (!session) return <Problem text={resource.error} retry={resource.reload} />
  const path = '/phien-hoc/' + session.id
  const placement=session.mode==='placement'
  const modeName=placement?'Kiểm tra đầu vào · '+label('level',session.level):studyModes[session.mode]
  const first = session.items.findIndex(x => !x.attempt)
  const index = params.has('cau') ? Math.max(0, Math.min(session.items.length - 1, Number.parseInt(params.get('cau')!, 10) || 0)) : first
  const item = session.items[index]
  const done = session.items.filter(x => x.attempt)
  const finish = () => void action.run(async () => setFinished(await api<Session>('/study-sessions/' + session.id + '/finish', { method: 'POST' })))
  if (!session.endedAt && item && first !== -1) return <div className="study-room">
    <nav className="session-bar" aria-label="Điều hướng phiên học"><span><Clock3 size={17} />{modeName} · Câu {index + 1}/{session.items.length}</span>
      <div className="action-row">
        {index > 0 && <ActionLink href={path + '?cau=' + (index - 1)}><ArrowLeft size={15} /> Câu trước</ActionLink>}
        {index < session.items.length - 1 && <ActionLink href={path + '?cau=' + (index + 1)}>Câu sau <ArrowRight size={15} /></ActionLink>}
        <Button onClick={finish} disabled={action.busy}>Kết thúc phiên</Button>
      </div></nav>
    <Problem text={action.error} />
    {item.attempt ? <div className="panel content-panel"><h2>{item.title}</h2><ActionLink href={'/luot-luyen/' + item.attempt.id}>Xem lượt đã nộp</ActionLink></div> :
      <PracticeRoute key={item.slug} slug={item.slug} session={{ id, mode: session.mode, version: item.version }} />}
  </div>
  const evidenced=(i:Item)=>i.attempt?.transfer===true || i.attempt?.correct===true && !i.attempt.hintSeen && !i.attempt.answerSeen
  const gaps=placement?[...new Set(session.items.filter(i=>!evidenced(i)).map(i=>i.topic).filter((t):t is string=>!!t))]:[]
  return <div className="page narrow">
    <PageTitle title={placement?'Kết quả kiểm tra đầu vào':'Tổng kết phiên học'} description={modeName + ' · ' + session.minutes + ' phút dự kiến'} />
    {placement && <section className="panel content-panel stack"><h2>Điểm bắt đầu cho lộ trình</h2>
      <p>{session.items.filter(evidenced).length}/{session.items.length} câu có bằng chứng độc lập trong lượt này. Kết quả chỉ phản ánh những câu đã hỏi.</p>
      {gaps.length>0 && <><p>Cần kiểm chứng thêm · {gaps.map(t=>label('topics',t)).join(', ')}</p>
        <Button disabled={action.busy||gaps.every(t=>goal.reviewTopics.includes(t))} onClick={()=>void action.run(async()=>{
          setGoal(await api('/profile',{method:'PUT',body:{...goal,reviewTopics:[...new Set([...goal.reviewTopics,...gaps])]}}))
        })}>{gaps.every(t=>goal.reviewTopics.includes(t))?'Đã ưu tiên trong lộ trình':'Ưu tiên các chủ đề này trong lộ trình'}</Button></>}
      {session.coding && <div className="stack"><h3>Phần thực hành</h3><span>{session.codingResult?
        runStatuses[session.codingResult.status]+(session.codingResult.assisted?' · Có trợ giúp':''):'Chưa có lượt nộp cho bài kiểm tra này.'}</span>
        {!session.endedAt && <ActionLink href={'/coding/'+session.coding.slug+'?version='+session.coding.version+'&placement='+session.id}>Mở bài code đầu vào</ActionLink>}
        {session.coding.submission && <Button onClick={()=>{setFinished(undefined);resource.reload()}}>Cập nhật kết quả code</Button>}</div>}
      <Link className="text-link" href="/ky-nang">Xem cây kỹ năng</Link><Problem text={action.error}/>
    </section>}
    <section className="panel content-panel stack"><h2>{done.length} / {session.items.length} câu đã xử lý</h2>
      {session.items.map(x => <div className="study-row" key={x.slug}><ListChecks aria-hidden="true" size={19} /><span>
        <strong>{x.attempt ? <Link href={'/luot-luyen/' + x.attempt.id}>{x.title}</Link> : x.title}</strong>
        <small>{!x.attempt ? 'Chưa luyện' : x.attempt.outcome === 'skipped' ? 'Đã bỏ qua · hãy thử lại' :
          x.attempt.correct === false ? 'Chưa đúng · đối chiếu lời giải rồi thử lại' : x.attempt.hintSeen || x.attempt.answerSeen ? 'Lần tới hãy thử tự trả lời trước khi xem gợi ý' :
          x.attempt.correct ? 'Đúng theo đáp án' : x.attempt.rating ? labels.rating[x.attempt.rating as keyof typeof labels.rating] : 'Đã nộp tự luận'}
        {x.attempt?.due && ' · Ôn ' + shortDate(x.attempt.due)}</small></span></div>)}
      <div className="action-row">{session.endedAt ? <ActionLink tone="primary" href="/phien-hoc">Tạo phiên mới <ArrowRight size={15} /></ActionLink> :
        <Button onClick={finish} disabled={action.busy} tone="primary"><Check size={16} /> Hoàn tất phiên</Button>}
        <ActionLink href="/on-tap">Lịch ôn của tôi</ActionLink></div>
      <Problem text={action.error} />
    </section>
  </div>
}
