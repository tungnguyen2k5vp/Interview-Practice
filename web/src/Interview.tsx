import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, Braces, Clock3, Database, Lightbulb, Mic, Pause, Play, RotateCcw, SquareTerminal } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { useDraft } from './draft'
import { Voice } from './Voice'
import { DraftConflict, ownerKey } from './Practice'
import { SignInGate, signInLink, useSession } from './session'
import type { Interview, Preset } from './types'
import { label, labels } from './types'
import { ActionLink, Badge, Button, CodeBlock, Dialog, Field, Link, Loading, Options, PageTitle, Problem, Ratings, RubricPanel, Segments, TopicChecks, navigate, timeText } from './ui'

const presetIcons = { foundation: Braces, backend: SquareTerminal, 'problem-solving': Database }
export function InterviewSetup({ params }: { params: URLSearchParams }) {
  const presets = useResource<Preset[]>('/interview-presets')
  const dashboard = useResource<{ resume?: { label: string; path: string } }>('/dashboard')
  const resume = dashboard.data?.resume
  const { user, goal } = useSession()
  const [preset, setPreset] = useState(params.get('preset') || 'foundation')
  const [topics, setTopics] = useState<string[] | null>(() => params.has('topics') ?
    [...new Set((params.get('topics') ?? '').split(',').filter(k => Object.hasOwn(labels.topics, k)))] : null)
  const [level, setLevel] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [language, setLanguage] = useState('')
  const [minutes, setMinutes] = useState('15')
  const [mode, setMode] = useState('guided')
  const [count, setCount] = useState('')
  const [preferWeak, setPreferWeak] = useState(false)
  const startId = useRef(crypto.randomUUID())
  const action = useAction()
  const current = presets.data?.find(x => x.id === preset)
  const reviewOf = params.get('review')
  function start() {
    if (!user) { navigate(signInLink()); return }
    void action.run(async () => {
      const data = await api<Interview>('/interviews', { method: 'POST', body: {
        id: startId.current, preset, level: level || goal.level || 'junior', difficulty: difficulty || null,
        topics: topics ?? (reviewOf ? [] : current?.topics ?? []), minutes: Number(minutes), language: language || goal.language, mode, reviewOf,
        count: count ? Number(count) : null, preferWeak,
      } })
      navigate('/phong-van/' + data.session.id)
    })
  }
  return <div className="page">
    <PageTitle title="Phỏng vấn thử" description="Tập trả lời từng câu, xử lý câu đào sâu và xem lại cách bạn đã lập luận."
      action={<div className="action-row">{resume?.path.startsWith('/phong-van/') && <ActionLink href={resume.path}><Play size={16} /> Tiếp tục phiên</ActionLink>}
        <ActionLink href="/chuan-bi">Chuẩn bị theo CV và JD <ArrowRight size={15}/></ActionLink></div>} />
    {reviewOf && <p className="notice"><RotateCcw size={18} /> Ưu tiên các câu bỏ qua, chưa tự đánh giá hoặc còn cần luyện từ phiên trước.</p>}
    <section className="stack" aria-label="Các bộ phỏng vấn">
      {presets.loading && <Loading />}
      <Problem text={presets.error} retry={presets.reload} />
      <div className="card-grid preset-grid">{presets.data?.map(item => {
        const Icon = presetIcons[item.id as keyof typeof presetIcons] ?? Mic
        return <button className="panel preset-card" key={item.id} type="button" aria-pressed={preset === item.id} onClick={() => { setPreset(item.id); setTopics(null) }}>
          <span className="topic-icon tone-oop"><Icon size={21} /></span><strong>{item.name}</strong><span>{item.description}</span>
        </button>
      })}</div>
    </section>
    <div className="setup-grid">
      <section className="panel content-panel stack">
        <h2>Thiết lập phiên</h2>
        <div className="form-grid">
          <Field label="Mức mục tiêu"><select value={level || goal.level || 'junior'} onChange={e => setLevel(e.target.value)}><Options values={labels.level} /></select></Field>
          <Field label="Độ khó"><select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="">Tất cả</option><Options values={labels.difficulty} /></select></Field>
          <Field label="Ngôn ngữ"><select value={language || goal.language} onChange={e => setLanguage(e.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></Field>
          <Field label="Thời lượng"><select value={minutes} onChange={e => setMinutes(e.target.value)}>{[15, 30, 45].map(x => <option key={x} value={x}>{x} phút</option>)}</select></Field>
          <Field label="Số câu"><select value={count} onChange={e => setCount(e.target.value)}><option value="">Theo thời lượng</option>
            {Array.from({ length: Math.min(12, Math.floor(Number(minutes) / 2)) }, (_, i) => <option key={i} value={i+1}>{i+1}</option>)}</select></Field>
          <label className="check-chip"><input type="checkbox" checked={preferWeak} onChange={e => setPreferWeak(e.target.checked)} />Ưu tiên câu cần ôn</label>
        </div>
        <TopicChecks legend={reviewOf ? 'Chủ đề · để trống dùng chủ đề của phiên trước' : 'Chủ đề · để trống dùng bộ mặc định'}
          value={topics ?? (reviewOf ? [] : current?.topics ?? [])} change={setTopics} />
      </section>
      <section className="panel content-panel stack">
        <h2>Chế độ luyện</h2>
        <Segments values={[[ 'guided', 'Có hướng dẫn' ], [ 'mock', 'Mô phỏng' ]]} title="Chế độ phỏng vấn" selected={mode} change={setMode} />
        <p>{mode === 'guided' ? 'Có gợi ý và phản hồi theo từng câu. Bạn có thể tạm dừng đồng hồ.' : 'Mỗi lần hiện một câu. Đáp án và rubric mở ở báo cáo cuối. Đồng hồ chạy liên tục kể cả khi tải lại hoặc rời trang.'}</p>
        <p className="muted small">Có tối đa một câu đào sâu biên soạn sẵn mỗi câu. Khi hết thời gian, phiên chốt ở các câu đã gửi.</p>
        <Problem text={action.error} />
        <Button tone="primary" disabled={!current || action.busy} onClick={start}>{action.busy ? 'Đang mở phiên…' : user ? 'Bắt đầu phỏng vấn' : 'Đăng nhập để bắt đầu'} <ArrowRight size={16} /></Button>
      </section>
    </div>
  </div>
}

export function InterviewRoute({ id }: { id: string }) {
  const { user } = useSession()
  const resource = useResource<Interview>(user ? '/interviews/' + encodeURIComponent(id) : null)
  if (!user) return <SignInGate detail="Phiên phỏng vấn được lưu riêng. Đăng nhập để tiếp tục." />
  if (resource.loading) return <Loading />
  if (!resource.data) return <Problem text={resource.error} retry={resource.reload} />
  return <InterviewWork key={id} initial={resource.data} owner={user.id} />
}

function InterviewWork({ initial, owner }: { initial: Interview; owner: string }) {
  const [data, setData] = useState(initial)
  const [received, setReceived] = useState(() => performance.now())
  const [confirm, setConfirm] = useState(false)
  const [limit, setLimit] = useState(false)
  const action = useAction()
  const { session, current, report } = data
  const base = '/interviews/' + session.id
  function update(value: Interview) {
    setReceived(performance.now())
    setData(value)
  }
  function reload() { return action.run(async () => update(await api<Interview>(base))) }
  const seconds = session.status === 'paused' ? data.pausedSeconds ?? 0 :
    Math.max(0, (Date.parse(data.deadline) - Date.parse(data.serverNow)) / 1000)
  const showTimer = session.status === 'active' || session.status === 'paused'
  const request = useRef<{ action: string; revision: number; id: string; text?: string } | null>(null)
  async function send(kind: string, revision: number, text?: string) {
    if (request.current?.action !== kind || request.current.revision !== revision || request.current.text !== text)
      request.current = { action: kind, revision, id: crypto.randomUUID(), text }
    const value = await api<Interview>(base + '/actions', { method: 'POST', body: request.current })
    update(value)
    return value
  }
  function rate(position: number, rating: string) {
    void action.run(async () => update(await api<Interview>(base + '/ratings/' + position, { method: 'PUT', body: { rating } })))
  }
  return <div className="page narrow">
    <PageTitle title={report ? 'Báo cáo phỏng vấn' : label('preset', session.preset)} back={['/phong-van', 'Phỏng vấn thử']}
      description={report ? label('preset', session.preset) + ' · ' + label('status', session.status)
        : session.mode === 'guided' ? 'Luyện có hướng dẫn · Câu đào sâu biên soạn sẵn' : 'Mô phỏng phỏng vấn · Phản hồi ở cuối phiên'}
      action={showTimer && <div className="session-clock"><Clock3 size={19} /><SessionTimer seconds={seconds} received={received}
        paused={session.status === 'paused'} expired={() => { setLimit(true); void reload() }} /></div>} />
    {report ? <InterviewReport data={data} busy={action.busy} rate={rate} /> : current && <>
      <div className="session-progress"><span>Câu {data.position + 1} / {data.count}</span>
        <progress max={data.count} value={data.position + 1} aria-label="Vị trí câu trong phiên" />
        <Badge tone={session.status === 'paused' ? 'amber' : 'indigo'}>{session.status === 'paused' ? 'Đã tạm dừng' : session.language === 'en' ? 'English' : 'Tiếng Việt'}</Badge>
      </div>
      {data.stage === 'feedback' ? <section className="panel content-panel stack">
        <h2>Đối chiếu câu {data.position + 1}</h2>
        <div className="written-answer">{current.answer}</div>
        {current.followUpAnswer && <div className="written-answer">{current.followUpAnswer}</div>}
        {current.reference && <RubricPanel reference={current.reference} />}
        <Ratings rating={current.rating} busy={action.busy} change={rating => rate(data.position, rating)} />
        <div className="action-row"><Button tone="primary" disabled={action.busy || limit || session.status !== 'active'} onClick={() => void action.run(() => send('next', data.revision))}>
          {data.position + 1 === data.count ? 'Xem báo cáo' : 'Câu tiếp theo'} <ArrowRight size={16} /></Button>
          {session.status === 'paused' && <Button disabled={action.busy} onClick={() => void action.run(() => send('resume', data.revision))}><Play size={16} /> Tiếp tục</Button>}
        </div>
      </section> : <InterviewAnswer key={data.position + ':' + data.stage} data={data} blocked={limit} owner={owner} send={send} recover={async () => {
        const next = await api<Interview>(base)
        update(next)
        return next
      }} />}
      <div className="split session-actions">
        <span className="small muted">Thứ tự và phiên bản câu hỏi được lưu khi bắt đầu.</span>
        <Button tone="quiet" disabled={action.busy} onClick={() => setConfirm(true)}>Kết thúc sớm</Button>
      </div>
    </>}
    <Problem text={action.error} retry={() => void reload()} />
    <Dialog title="Kết thúc phiên sớm?" open={confirm} onClose={() => setConfirm(false)}><p>Các câu đã gửi sẽ xuất hiện trong báo cáo.</p>
      <div className="action-row"><Button onClick={() => setConfirm(false)}>Tiếp tục luyện</Button>
        <Button tone="danger" disabled={action.busy} onClick={() => void action.run(async () => { await send('end', data.revision); setConfirm(false) })}>Kết thúc phiên</Button></div>
      <Problem text={action.error} />
    </Dialog>
  </div>
}

function SessionTimer({ seconds, received, paused, expired }: { seconds: number; received: number; paused: boolean; expired: () => void }) {
  const [now, setNow] = useState(() => performance.now())
  const expiryCallback = useRef(expired)
  expiryCallback.current = expired
  const remaining = Math.max(0, Math.ceil(seconds - (paused ? 0 : Math.max(0, now - received) / 1000)))
  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => setNow(performance.now()), 300)
    return () => window.clearInterval(timer)
  }, [paused])
  useEffect(() => {
    if (!paused && remaining === 0) expiryCallback.current()
  }, [paused, remaining])
  return <span aria-label={paused ? 'Đồng hồ tạm dừng' : 'Thời gian còn lại'} data-warning={remaining <= 60}>{timeText(remaining)}</span>
}

function InterviewAnswer({ data, blocked, owner, send, recover }: {
  data: Interview; blocked: boolean; owner: string
  send: (kind: string, revision: number, text?: string) => Promise<Interview>
  recover: () => Promise<Interview>
}) {
  const { session, current, position, stage } = data
  const paused = session.status === 'paused'
  const action = useAction()
  const draft = useDraft(ownerKey(owner, 'interview', session.id + ':' + position + ':' + stage),
    { stamp: data.revision, text: data.draft }, async snapshot => {
      const saved = await send('draft', snapshot.stamp, snapshot.text)
      return { stamp: saved.revision, text: saved.draft }
    }, Object.is, !paused && !blocked)
  const coach = useResource<{available: boolean}>(session.mode === 'guided' && stage === 'followup' ? '/ai/status' : null)
  const textRef = useRef(draft.text)
  textRef.current = draft.text
  function act(kind: string, value?: string) {
    void action.run(async () => {
      const revision = paused ? data.revision : await draft.flush()
      const next = await send(kind, revision, value)
      if (next.position !== position || next.stage !== stage || next.report) draft.discard()
      else draft.accept({ stamp: next.revision, text: next.draft })
    })
  }
  function resolve(keep: boolean) {
    void action.run(async () => {
      const remote = await recover()
      if (remote.position === position && remote.stage === stage && !remote.report)
        draft.accept({ stamp: remote.revision, text: remote.draft }, keep)
    })
  }
  if (!current) return null
  const unusable = action.busy || paused || blocked || draft.state === 'conflict'
  return <section className="panel content-panel stack">
    <div className="metadata"><Badge tone={current.topic}>{label('topics', current.topic)}</Badge><span>Phiên bản {current.version}</span>
      {stage === 'followup' && <Badge tone="indigo">Câu đào sâu · 1 / 1</Badge>}</div>
    <h2>{stage === 'followup' ? 'Câu hỏi đào sâu' : current.title}</h2>
    <p className="prompt-text" lang={session.language}>{current.text}</p>
    {current.context && <p className="muted">{current.context}</p>}
    {current.code && <CodeBlock language="C#">{current.code}</CodeBlock>}
    {current.hint && <p className="notice hint">{current.hint}</p>}
    {stage === 'followup' && current.answer && <details className="details">
      <summary>Câu trả lời vừa gửi</summary><p className="written-answer" lang={session.language}>{current.answer}</p>
    </details>}
    {coach.data?.available && !draft.text && <Button disabled={unusable} onClick={() => void action.run(async () => {
      await api('/interviews/' + session.id + '/coach-followup?revision=' + data.revision, {method: 'POST'})
      const next = await recover(); draft.accept({stamp: next.revision, text: next.draft})
    })}>Gửi câu trả lời vừa nộp cho AI để hỏi sâu</Button>}
    <Voice key={position + stage + String(unusable)} prompt={current.text} language={session.language} disabled={unusable} append={text => {
      textRef.current = (textRef.current + ' ' + text).trim().slice(0, 16000); draft.change(textRef.current)
    }} />
    <Field label="Câu trả lời"><textarea rows={7} maxLength={16000} value={draft.text} lang={session.language}
      readOnly={paused || action.busy || blocked} onChange={e => draft.change(e.target.value)} placeholder={session.language === 'en' ? 'Write your answer in English…' : 'Trình bày câu trả lời của bạn…'} /></Field>
    <div className="split"><span className="small muted" role="status">{paused ? 'Đồng hồ đã dừng' : draft.stateText}</span>
      <div className="action-row">
        {session.mode === 'guided' && !paused && stage === 'question' && !current.hint && <Button disabled={unusable} onClick={() => act('hint')}><Lightbulb size={16} /> Xin gợi ý</Button>}
        {paused ? <Button tone="primary" disabled={action.busy} onClick={() => act('resume')}><Play size={16} /> Tiếp tục</Button> : <>
          <Button tone="quiet" disabled={unusable} onClick={() => act('skip')}>Bỏ qua</Button>
          <Button tone="quiet" disabled={unusable} onClick={() => act('answer', session.language === 'en' ? "I don't know" : 'Chưa biết')}>Chưa biết</Button>
          <Button tone="primary" disabled={unusable || !draft.text.trim()} onClick={() => act('answer', draft.text)}>Gửi câu trả lời <ArrowRight size={16} /></Button>
        </>}
      </div>
    </div>
    {session.mode === 'guided' && !paused && <Button tone="quiet" disabled={unusable} onClick={() => act('pause', draft.text)}><Pause size={16} /> Tạm dừng</Button>}
    {draft.state === 'conflict' && <DraftConflict onServer={() => resolve(false)} onKeep={() => resolve(true)} busy={action.busy} />}
    <Problem text={action.error || (draft.state === 'error' ? draft.issue : '')} retry={action.error ? () => resolve(true) : undefined} />
  </section>
}

function InterviewReport({ data, rate, busy }: { data: Interview; rate: (index: number, rating: string) => void; busy: boolean }) {
  const report = data.report ?? []
  const next = [...report].filter(x => x.rating !== 'clear').sort((a, b) => Number(b.status === 'skipped') - Number(a.status === 'skipped')).slice(0, 3)
  return <div className="stack">
    <section className="panel content-panel stack">
      <div className="metadata"><Badge tone="indigo"><AudioLines size={15} /> Bộ câu biên soạn</Badge><Badge>{data.session.language === 'en' ? 'English' : 'Tiếng Việt'}</Badge></div>
      <div className="report-summary">
        <div><strong>{report.filter(x => x.status === 'answered').length}</strong><span>đã trả lời</span></div>
        <div><strong>{report.filter(x => x.status === 'skipped').length}</strong><span>đã bỏ qua</span></div>
        <div><strong>{report.filter(x => x.rating).length}</strong><span>đã tự đánh giá</span></div>
      </div>
      <p className="muted">Báo cáo gồm câu trả lời đã ghi, tự đánh giá của bạn và rubric tham khảo. Các câu chưa tự chấm có nhãn Chưa đánh giá.</p>
    </section>
    <section className="panel content-panel stack">
      <div className="split"><h2>Ưu tiên luyện tiếp</h2><ActionLink tone="primary" href={'/phong-van?review=' + data.session.id + '&preset=' + data.session.preset}><RotateCcw size={16} /> Tạo phiên ôn</ActionLink></div>
      {next.length ? <ul className="lined-list">{next.map(x => <li key={x.position}><Link href={'/cau-hoi/' + x.slug}>{x.title}</Link>
        <span>{x.rating ? label('rating', x.rating) : x.status === 'answered' ? 'Chưa đánh giá' : label('status', x.status)}</span></li>)}</ul>
        : <p className="muted">Mọi câu trong bộ đã được bạn tự đánh giá là giải thích được.</p>}
    </section>
    <section className="stack">
      <h2>Các câu trong phiên</h2>
      {report.map(x => <details className="panel report-item" key={x.position}>
        <summary><span>{x.position + 1}. {x.title}</span><Badge tone={x.rating ? 'indigo' : 'neutral'}>{x.rating ? label('rating', x.rating) : 'Chưa đánh giá'}</Badge></summary>
        <div className="content-panel stack">
          <div className="metadata"><Badge tone={x.topic}>{label('topics', x.topic)}</Badge><span>{label('status', x.status)}</span>{x.hintSeen && <span>Đã xem gợi ý</span>}</div>
          <p>{x.prompt}</p>
          {x.answer && <div className="written-answer">{x.answer}</div>}
          {x.followUp && <><h3>Đào sâu</h3><p>{x.followUp}</p><p className="written-answer">{x.followUpAnswer ?? (x.followUpSkipped ? 'Đã bỏ qua' : 'Chưa trả lời')}</p></>}
          <RubricPanel reference={x.reference} />
          {x.status === 'answered' && <Ratings rating={x.rating} busy={busy} change={rating => rate(x.position, rating)} />}
        </div>
      </details>)}
    </section>
  </div>
}
