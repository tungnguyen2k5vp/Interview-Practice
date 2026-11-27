import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, Braces, Clock3, Database, Lightbulb, Mic, Pause, Play, RotateCcw, SquareTerminal } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { useDraft } from './draft'
import { Voice } from './Voice'
import { DraftConflict, ownerKey } from './Practice'
import { SignInGate, signInLink, useSession } from './session'
import type { Interview, InterviewObservation, Preset } from './types'
import { label, labels } from './types'
import { ActionLink, Badge, Button, CodeBlock, Dialog, Field, Link, Loading, Options, PageTitle, Problem, Ratings, RubricPanel, Segments, TopicChecks, navigate, timeText } from './ui'

const presetIcons = { foundation: Braces, backend: SquareTerminal, 'problem-solving': Database }
const modes = { offline: 'Bộ câu hỏi', 'guided-ai': 'AI hướng dẫn', 'realistic-ai': 'AI mô phỏng', guided: 'Có hướng dẫn', mock: 'Mô phỏng theo bộ câu' }
const guided = (mode: string) => ['offline', 'guided', 'guided-ai'].includes(mode)
const aiStates: Record<string, string> = { offline: 'AI chưa cấu hình', budget: 'Đã dùng hết ngân sách phiên', time: 'Thời gian còn lại quá ngắn',
  quota: 'Đã chạm hạn mức AI', timeout: 'AI phản hồi quá thời gian', fallback: 'Chưa nhận được phản hồi AI hợp lệ' }
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
  const [mode, setMode] = useState('offline')
  const [timed, setTimed] = useState(false)
  const [consent, setConsent] = useState(false)
  const [aiLimit, setAiLimit] = useState(2)
  const automatic = mode !== 'offline'
  const provider = useResource<{available: boolean}>(automatic ? '/ai/status' : null)
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
        topics: topics ?? (reviewOf ? [] : current?.topics ?? []), minutes: Number(minutes), language: language || goal.language,
        mode: !automatic && timed ? 'mock' : mode, reviewOf, count: count ? Number(count) : null, preferWeak,
        aiConsent: automatic && consent, aiLimit: automatic ? aiLimit : 0,
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
        return <button className="panel preset-card" key={item.id} type="button" aria-pressed={preset === item.id} onClick={() => { setPreset(item.id); setTopics(null); setLevel(item.targetLevel??''); setMinutes(String(item.minutes??15)); setCount('') }}>
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
        <Field label="Hình thức phỏng vấn"><select value={mode} onChange={e => { setMode(e.target.value); setConsent(false) }}>
          {(['offline', 'guided-ai', 'realistic-ai'] as const).map(key => <option key={key} value={key}>{modes[key]}</option>)}
        </select></Field>
        {automatic ? <>
          <p>{mode === 'guided-ai' ? 'AI chọn câu đào sâu từ lập luận của bạn. Mở gợi ý khi cần, rồi đối chiếu sau từng câu.'
            : 'Đồng hồ chạy liên tục. Bạn trả lời từng câu và xem toàn bộ nhận xét khi kết thúc.'}</p>
          <Field label="Ngân sách AI cho phiên"><select value={aiLimit} onChange={e => setAiLimit(Number(e.target.value))}>
            {[1,2,3,4].map(n => <option key={n} value={n}>{n} lượt</option>)}</select></Field>
          <label className="check-chip"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            Tôi đồng ý gửi phần trả lời hiện tại và trích đoạn tối đa hai lượt trước cho AI trong phiên này.</label>
          <p className="small muted">{provider.data?.available === false ? 'AI chưa cấu hình. Phiên sẽ dùng câu hỏi biên soạn sẵn.'
            : 'Mỗi lần yêu cầu AI dùng một lượt. Khi hết lượt hoặc AI gián đoạn, phiên tiếp tục bằng bộ câu hỏi.'}</p>
        </> : <><p>{timed ? 'Luyện từ bộ câu hỏi biên soạn. Đồng hồ chạy liên tục và đáp án mở cuối phiên.' : 'Luyện từ bộ câu hỏi và câu đào sâu đã biên soạn. Bạn có thể xem gợi ý và tạm dừng.'}</p>
          <label className="check-chip"><input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)} />Thi tính giờ, mở đáp án cuối phiên</label></>}
        <Problem text={action.error} />
        <Button tone="primary" disabled={!current || action.busy || automatic && !consent} onClick={start}>{action.busy ? 'Đang mở phiên…' : user ? 'Bắt đầu phỏng vấn' : 'Đăng nhập để bắt đầu'} <ArrowRight size={16} /></Button>
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
        : modes[session.mode] + (data.aiLimit ? ' · Đã dùng ' + data.aiUsed + '/' + data.aiLimit + ' lượt AI' : '')}
      action={showTimer && <div className="session-clock"><Clock3 size={19} /><SessionTimer seconds={seconds} received={received}
        paused={session.status === 'paused'} expired={() => { setLimit(true); void reload() }} /></div>} />
    {report ? <InterviewReport data={data} busy={action.busy} rate={rate} update={update} /> : current && <>
      <div className="session-progress"><span>Câu {data.position + 1} / {data.count}</span>
        <progress max={data.count} value={data.position + 1} aria-label="Vị trí câu trong phiên" />
        <Badge tone={session.status === 'paused' ? 'amber' : 'indigo'}>{session.status === 'paused' ? 'Đã tạm dừng' : session.language === 'en' ? 'English' : 'Tiếng Việt'}</Badge>
      </div>
      {data.stage === 'feedback' ? <section className="panel content-panel stack">
        <h2>Đối chiếu câu {data.position + 1}</h2>
        <div className="written-answer">{current.answer}</div>
        {current.followUpAnswer && <div className="written-answer">{current.followUpAnswer}</div>}
        {current.reference && <RubricPanel reference={current.reference} />}
        {current.feedback && <Observation value={current.feedback} />}
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
    {stage === 'followup' && current.aiState && <p className="small muted">{current.aiState === 'assessed' ? 'Câu đào sâu theo câu trả lời của bạn'
      : aiStates[current.aiState] + ' · Đang dùng câu đào sâu biên soạn sẵn.'}</p>}
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
        {guided(session.mode) && !paused && stage === 'question' && !current.hint && <Button disabled={unusable} onClick={() => act('hint')}><Lightbulb size={16} /> Xin gợi ý</Button>}
        {paused ? <Button tone="primary" disabled={action.busy} onClick={() => act('resume')}><Play size={16} /> Tiếp tục</Button> : <>
          <Button tone="quiet" disabled={unusable} onClick={() => act('skip')}>Bỏ qua</Button>
          <Button tone="quiet" disabled={unusable} onClick={() => act('answer', session.language === 'en' ? "I don't know" : 'Chưa biết')}>Chưa biết</Button>
          <Button tone="primary" disabled={unusable || !draft.text.trim()} onClick={() => act('answer', draft.text)}>Gửi câu trả lời <ArrowRight size={16} /></Button>
        </>}
      </div>
    </div>
    {guided(session.mode) && !paused && <Button tone="quiet" disabled={unusable} onClick={() => act('pause', draft.text)}><Pause size={16} /> Tạm dừng</Button>}
    {action.busy && data.aiLimit > data.aiUsed && <span className="small muted" role="status">Đang lưu và xử lý lượt trả lời…</span>}
    {draft.state === 'conflict' && <DraftConflict onServer={() => resolve(false)} onKeep={() => resolve(true)} busy={action.busy} />}
    <Problem text={action.error || (draft.state === 'error' ? draft.issue : '')} retry={action.error ? () => resolve(true) : undefined} />
  </section>
}

const findingLabels: Record<string, string> = { demonstrated: 'Kiến thức đã thể hiện', gap: 'Ý còn thiếu', misconception: 'Nhận định cần kiểm tra',
  reasoning: 'Giải thích nguyên nhân', example: 'Ví dụ thực tế', depth: 'Chiều sâu lập luận', contradiction: 'Điểm chưa nhất quán' }
const reviewLabels: Record<string, string> = { skipped: 'Đã bỏ qua', unanswered: 'Chưa trả lời', self: 'Tự đánh giá cần luyện',
  assisted: 'Đã dùng gợi ý', followup: 'Chưa trả lời câu đào sâu', ai: 'AI đề nghị đối chiếu', unrated: 'Chưa đánh giá' }

function Observation({ value }: { value: InterviewObservation }) {
  return <div className="stack">
    <h3>Nhận xét AI</h3>
    {value.assessment.findings.map((finding, i) => <div key={i} className="interview-finding">
      <strong>{findingLabels[finding.kind]}</strong><blockquote>{finding.quote}</blockquote><p>{finding.note}</p>
    </div>)}
    <details className="details"><summary>Cách diễn đạt AI đề xuất</summary><p>{value.assessment.improvedAnswer}</p></details>
    <small className="muted">{value.model} · Nhận xét tham khảo theo lượt trả lời.</small>
  </div>
}

function Rewrite({ saved, save }: { saved?: string; save: (text: string) => Promise<void> }) {
  const [text, setText] = useState(saved ?? '')
  const action = useAction()
  return <form className="stack" onSubmit={e => { e.preventDefault(); void action.run(() => save(text)) }}>
    <Field label="Bản viết lại của bạn"><textarea rows={3} maxLength={16000} value={text} onChange={e => setText(e.target.value)} /></Field>
    <Button type="submit" disabled={action.busy || text.trim() === (saved ?? '')}>Lưu bản viết lại</Button><Problem text={action.error} />
  </form>
}

function InterviewReport({ data, rate, busy, update }: { data: Interview; rate: (index: number, rating: string) => void; busy: boolean; update: (data: Interview) => void }) {
  const report = data.report ?? []
  const next = report.filter(x => x.reviewReason).sort((a, b) => Number(b.reviewReason === 'ai') - Number(a.reviewReason === 'ai'))
  const topics = [...new Set(report.filter(x => x.status !== 'unasked').map(x => x.topic))]
  const answered = report.filter(x => x.status === 'answered').length
  const followUps = report.filter(x => x.followUpAnswer).length
  const action = useAction()
  const ids = useRef(new Map<number | undefined, string>())
  const base = '/interviews/' + data.session.id
  const [days, setDays] = useState('7')
  const schedule = days === '3' ? [1,2,3] : days === '7' ? [1,3,5,7] : [1,3,6,10,14]
  const practice = (position?: number) => void action.run(async () => {
    const id = ids.current.get(position) ?? crypto.randomUUID()
    ids.current.set(position, id)
    const session = await api<{id: string}>(base + '/review-session', {method:'POST', body:{id, position}})
    navigate('/phien-hoc/' + session.id)
  })
  return <div className="stack">
    <section className="panel content-panel stack">
      <div className="metadata"><Badge tone="green"><AudioLines size={15} /> {modes[data.session.mode]}</Badge><span>{data.session.language === 'en' ? 'English' : 'Tiếng Việt'}</span>
        <span>{timeText(data.activeSeconds)} trong phiên</span>{data.aiLimit > 0 && <span>{data.aiUsed}/{data.aiLimit} lượt AI</span>}</div>
      <div className="report-summary">
        <div><strong>{answered}/{report.length}</strong><span>câu đã trả lời</span></div>
        <div><strong>{report.filter(x => x.status === 'skipped').length}</strong><span>đã bỏ qua</span></div>
        <div><strong>{followUps}</strong><span>lượt đào sâu đã trả lời</span></div>
      </div>
      {topics.length > 0 && <details className="details"><summary>Kết quả theo chủ đề</summary>
        <ul className="lined-list">{topics.map(topic => {
          const items = report.filter(x => x.topic === topic && x.status !== 'unasked')
          return <li key={topic}><strong>{label('topics', topic)}</strong><span>{items.filter(x => x.status === 'answered').length}/{items.length} câu đã trả lời · {items.filter(x => x.reviewReason).length} cần ôn</span></li>
        })}</ul></details>}
      {data.session.status === 'completed' && <details className="details"><summary>Đối chiếu phiên trước</summary>
        {data.previous ? <p><Link href={'/phong-van/' + data.previous.id}>Phiên ngày {new Date(data.previous.at).toLocaleDateString('vi')}</Link> cùng chế độ, ngôn ngữ, thời lượng và bộ câu.
          {' '}{data.previous.answered} câu đã trả lời, {data.previous.followUps} lượt đào sâu, {timeText(data.previous.activeSeconds)}.</p>
          : <p>Chưa có phiên hoàn tất cùng điều kiện và phiên bản câu hỏi trong 30 phiên tương ứng gần nhất.</p>}</details>}
    </section>
    <section className="panel content-panel stack">
      <div className="split"><h2>Ưu tiên luyện tiếp</h2><ActionLink href={'/phong-van?review=' + data.session.id + '&preset=' + data.session.preset}><RotateCcw size={16} /> Tạo phiên ôn</ActionLink></div>
      {next.length ? <>
        <ul className="lined-list">{next.map(x => <li key={x.position}><span><strong>{x.title}</strong><br/>{reviewLabels[x.reviewReason!]}</span>
          <Button disabled={action.busy} onClick={() => practice(x.position)} aria-label={'Ôn câu ' + x.title}>Ôn câu này</Button></li>)}</ul>
        <details className="details"><summary>Kế hoạch sau phỏng vấn</summary><div className="stack">
          <Segments title="Thời hạn kế hoạch" selected={days} change={setDays} values={['3','7','14'].map(d => [d, d + ' ngày'])}/>
          <ol className="interview-plan">{schedule.map((day, i) => {
            const batch = next.filter((_, index) => index % (schedule.length - 1) === i)
            const titles = (batch.length ? batch : [next[i % next.length]]).map(item => item.title).join(' · ')
            return <li key={day}><strong>Ngày {day}</strong><span>{i === schedule.length-1 ? 'Phỏng vấn lại với nhóm câu cần ôn.' :
              (i === 0 ? 'Đối chiếu rubric' : i % 2 ? 'Trả lời lại từ trí nhớ' : 'Giải thích bằng một ví dụ mới') + ' · ' + titles}</span></li>
          })}</ol></div></details>
        <Button tone="primary" disabled={action.busy} onClick={() => practice()}>Luyện các câu ưu tiên <ArrowRight size={16}/></Button>
      </> : <p className="muted">Chưa có câu nào cần ôn từ các lượt đã thực hiện.</p>}
      <Problem text={action.error}/>
    </section>
    <section className="stack">
      <h2>Các câu trong phiên</h2>
      {report.map(x => <details className="panel report-item" key={x.position}>
        <summary><span>{x.position + 1}. {x.title}</span><Badge tone={x.mainEntry?.observation ? 'green' : x.rating ? 'indigo' : 'neutral'}>{x.mainEntry?.observation
          ? 'Có nhận xét AI' : x.rating ? label('rating', x.rating) : x.status === 'answered' ? 'Chưa đánh giá' : label('status', x.status)}</Badge></summary>
        <div className="content-panel stack">
          <div className="metadata"><Badge tone={x.topic}>{label('topics', x.topic)}</Badge><span>{label('status', x.status)}</span>{x.hintSeen && <span>Đã xem gợi ý</span>}</div>
          <p>{x.prompt}</p>
          {x.answer && <div className="written-answer">{x.answer}</div>}
          {x.mainEntry && <small className="muted">Thời gian trả lời {timeText(x.mainEntry.seconds)}</small>}
          {x.mainEntry?.observation ? <Observation value={x.mainEntry.observation}/> : x.status === 'answered' &&
            <p className="muted small">{aiStates[x.mainEntry?.aiState ?? ''] ?? 'Chưa có đánh giá AI'}. Bạn có thể tự đối chiếu theo rubric.</p>}
          {x.followUp && <><h3>Đào sâu</h3><p>{x.followUp}</p><p className="written-answer">{x.followUpAnswer ?? (x.followUpSkipped ? 'Đã bỏ qua' : 'Chưa trả lời')}</p></>}
          {x.followEntry && <small className="muted">Thời gian trả lời đào sâu {timeText(x.followEntry.seconds)}</small>}
          {x.followEntry?.observation && <Observation value={x.followEntry.observation}/>}
          <RubricPanel reference={x.reference} />
          {x.status === 'answered' && <Ratings rating={x.rating} busy={busy} change={rating => rate(x.position, rating)} />}
          {x.status === 'answered' && <Rewrite saved={x.rewrite} save={async text => update(await api<Interview>(
            base + '/rewrites/' + x.position, {method:'PUT', body:{revision:data.revision, text}}))} />}
        </div>
      </details>)}
    </section>
  </div>
}
