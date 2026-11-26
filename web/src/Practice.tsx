import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bookmark, CalendarPlus, Check, Clock3, FileText, Lightbulb, RotateCcw } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { useDraft } from './draft'
import { SignInGate, useSession } from './session'
import { label } from './types'
import { rubricTitles } from './types'
import type { AiReview, AnswerRevision, Attempt, Card, DraftCursor, Page, PracticeData, PracticeDraft, Question, Reference } from './types'
import { ActionLink, Badge, Button, CodeBlock, Dialog, Difficulty, Field, Link, Loading, PageTitle, Problem, Ratings, RubricPanel, dateTime, navigate, timeText } from './ui'

type SessionContext = { id: string; mode: string; version: number }
export function PracticeRoute({ slug, session }: { slug: string; session?: SessionContext }) {
  const { user } = useSession()
  const segment = encodeURIComponent(slug)
  const resource = useResource<PracticeData | Question>(user ? '/practice/questions/' + segment + (session ? '?sessionId=' + session.id : '') : '/questions/' + segment)
  if (resource.loading) return <Loading />
  if (!resource.data) return <Problem text={resource.error} retry={resource.reload} />
  if ('question' in resource.data && user) {
    if (session && resource.data.question.card.version !== session.version) return <Problem text="Phiên bản trong kế hoạch khác bản đang mở. Bạn có thể chuyển câu hoặc kết thúc phiên để tạo kế hoạch mới." />
    return <QuestionEditor initial={resource.data} owner={user.id} key={slug} session={session} />
  }
  const question = resource.data as Question
  return <div className="page narrow">
    <QuestionTitle question={question} /><div className="panel content-panel"><Prompt question={question} language="vi" /></div>
    <SignInGate detail="Đăng nhập để tự trả lời, lưu nháp, xem đáp án và đặt lịch ôn." />
  </div>
}

function QuestionTitle({ question, action }: { question: Question; action?: React.ReactNode }) {
  const { card } = question
  const bank = new URLSearchParams(location.search).get('bank')
  return <>
    <PageTitle title={card.title} back={['/cau-hoi'+(bank ? '?'+bank : ''), 'Ngân hàng câu hỏi']} action={action} />
    {bank !== null && <BankNavigation slug={card.slug} filters={bank}/>}
    <div className="metadata">
      <Badge tone={card.topic}>{label('topics', card.topic)}</Badge><Difficulty value={card.difficulty} />
      <span>{label('level', card.level)}</span><span><Clock3 size={15} aria-hidden="true" />{card.minutes} phút</span>
      {card.technology && <span>{card.technology}</span>}
    </div>
  </>
}
function BankNavigation({ slug, filters }: { slug: string; filters: string }) {
  const result = useResource<Page<Card>>('/questions?'+filters)
  const action = useAction()
  const page = result.data
  if (!page) return <Problem text={result.error} retry={result.reload}/>
  const index = page.items.findIndex(x=>x.slug===slug)
  if (index < 0) return null
  function move(direction: number) {
    void action.run(async () => {
      const query = new URLSearchParams(filters)
      let target = page!.items[index+direction]
      if (!target) {
        query.set('page', String(page!.page + direction))
        const adjacent = await api<Page<Card>>('/questions?'+query)
        target = adjacent.items[direction > 0 ? 0 : adjacent.items.length-1]
      }
      if (target) navigate('/cau-hoi/'+target.slug+'?bank='+encodeURIComponent(query.toString()))
    })
  }
  return <nav className="action-row" aria-label="Các câu trong kết quả tìm kiếm">
    <Button disabled={action.busy || (index===0 && page.page===1)} onClick={()=>move(-1)}>Câu trước</Button>
    <span>{(page.page-1)*page.pageSize+index+1} / {page.total}</span>
    <Button disabled={action.busy || (page.page-1)*page.pageSize+index+1>=page.total} onClick={()=>move(1)}>Câu tiếp <ArrowRight size={15}/></Button>
    <Problem text={action.error}/></nav>
}
function Prompt({ question, language }: { question: Question; language: string }) {
  return <>
    <h2>Câu hỏi</h2>
    <p className="prompt-text" lang={language}>{language === 'en' ? question.englishPrompt : question.prompt}</p>
    {language === 'vi' && question.context && <p className="muted">{question.context}</p>}
    {question.code && <CodeBlock language="C#">{question.code}</CodeBlock>}
    <div className="tag-row">{question.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    {!!(question.prerequisites.length + question.related.length) && <RelatedList question={question}/>}
  </>
}
function RelatedList({ question }: { question:Question }) {
  const [open,setOpen]=useState(false)
  return <details className="details" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Kiến thức liên quan</summary>
    {open && ([['Nền tảng',question.prerequisites],['Học tiếp',question.related]] as const).map(([title,keys]) =>
      keys.length > 0 && <p key={title}>{title} · {keys.map((s,i)=><span key={s}>{i>0 && ', '}<RelatedQuestion slug={s}/></span>)}</p>)}</details>
}
function RelatedQuestion({ slug }: {slug:string}) {
  const q = useResource<Question>('/questions/'+slug)
  return q.data ? <Link className="text-link" href={'/cau-hoi/'+slug}>{q.data.card.title}</Link> : <span>{q.loading ? '…' : 'Chưa xuất bản'}</span>
}
function sameCursor(a: DraftCursor, b: DraftCursor) {
  return a.version === b.version && a.revision === b.revision && (a.revision === 0 || a.id === b.id)
}
const newCursor = (version: number): DraftCursor => ({ id: crypto.randomUUID(), version, revision: 0 })

function QuestionEditor({ initial, owner, session }: { initial: PracticeData; owner: string; session?: SessionContext }) {
  const { goal } = useSession()
  const [data, setData] = useState(initial)
  const [language, setLanguage] = useState<'vi' | 'en' | null>(null)
  const selectedLanguage = language ?? goal.language
  const [opened, setOpened] = useState(initial.draft)
  const [skipping, setSkipping] = useState(false)
  const [timer, setTimer] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState('')
  const action = useAction()
  const { question } = data
  const choices = session?.mode === 'essay' ? undefined : question.choices
  const base = '/practice/questions/' + question.card.slug
  const query = session ? '?sessionId=' + session.id : ''
  const fresh = useRef(newCursor(question.card.version))
  const draft = useDraft(ownerKey(owner, 'question', question.card.slug),
    { stamp: initial.draft?.cursor ?? fresh.current, text: initial.draft?.text ?? '' }, async snapshot => {
      const saved = await api<PracticeDraft>(base + '/draft' + query, { method: 'PATCH', body: { cursor: snapshot.stamp, text: snapshot.text } })
      setOpened(saved)
      return { stamp: saved.cursor, text: saved.text }
    }, sameCursor)

  useEffect(() => {
    if (!timer) return
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) setSeconds(n => Math.min(3600, n + 1))
    }, 1000)
    return () => window.clearInterval(tick)
  }, [timer])

  function toggleTimer() {
    if (timer) setTimer(false)
    else void action.run(async () => { await draft.flush(!opened); setTimer(true) })
  }
  function reveal(kind: 'hint' | 'answer') {
    void action.run(async () => {
      const cursor = await draft.flush()
      const result = await api<PracticeDraft>(base + '/reveal' + query, { method: 'POST', body: { cursor, kind } })
      draft.accept({ stamp: result.cursor, text: result.text }, true)
      setOpened(result)
    })
  }
  function submit(skip: boolean) {
    void action.run(async () => {
      const cursor = await draft.flush()
      const index = choices ? choices.vi.findIndex((option, i) => draft.text === option || draft.text === choices.en[i]) : -1
      const attempt = await api<Attempt>(base + '/submit', { method: 'POST',
        body: { cursor, language: selectedLanguage, skip, activeSeconds: seconds, choice: !skip && index >= 0 ? index : null, studySessionId: session?.id } })
      draft.discard()
      setTimer(false)
      setSkipping(false)
      navigate('/luot-luyen/' + attempt.id)
    })
  }
  function resolve(keep: boolean) {
    void action.run(async () => {
      const remote = await api<PracticeData>(base + query)
      draft.accept({ stamp: remote.draft?.cursor ?? newCursor(remote.question.card.version), text: remote.draft?.text ?? '' }, keep)
      setOpened(remote.draft)
      setData(remote)
    })
  }
  function mark(bookmarked: boolean) {
    void action.run(async () => {
      const card = await api<Card>(base + '/mark', { method: 'PUT', body: { bookmarked, setDue: false } })
      setData(old => ({ ...old, question: { ...old.question, card: { ...old.question.card, bookmarked: card.bookmarked } } }))
      setNotice(card.bookmarked ? 'Đã đánh dấu câu hỏi.' : 'Đã bỏ đánh dấu.')
    })
  }
  return <div className="page practice-page">
    <QuestionTitle question={question} action={<Button tone="secondary" aria-pressed={question.card.bookmarked} disabled={action.busy} onClick={() => mark(!question.card.bookmarked)}>
      <Bookmark size={17} fill={question.card.bookmarked ? 'currentColor' : 'none'} />{question.card.bookmarked ? 'Đã đánh dấu' : 'Đánh dấu'}
    </Button>} />
    <div className="practice-grid">
      <div className="stack">
        <section className="panel content-panel">
          <div className="prompt-area"><Prompt question={question} language={selectedLanguage} /></div>
        </section>
        <section className="panel content-panel stack">
          <div className="editor-top"><div><h2>Câu trả lời của bạn</h2><span className="small muted" role="status">{draft.stateText}</span></div>
            <Button onClick={toggleTimer} disabled={action.busy} aria-pressed={timer}><Clock3 size={16} /> {session?.mode === 'speed' ? (timer || seconds ? timeText(Math.max(0, 60 - seconds)) : 'Bắt đầu 60 giây') : timer || seconds ? timeText(seconds) : 'Bấm giờ'}</Button>
          </div>
          {session?.mode === 'speed' && seconds >= 60 && <p role="status" className="notice">Đã hết 60 giây. Bạn có thể hoàn thiện rồi nộp câu trả lời.</p>}
          {session?.mode === 'flashcard' && <Button disabled={action.busy || !!opened?.reference} onClick={() => reveal('answer')}><FileText size={16}/> Lật thẻ xem đáp án</Button>}
          {choices ? <fieldset className="quiz-options" disabled={action.busy}><legend>Chọn một đáp án</legend>
            {choices[selectedLanguage].map((text, i) => <label key={i}><input type="radio" name="choice" checked={draft.text === choices.vi[i] || draft.text === choices.en[i]} onChange={() => draft.change(text)} />{text}</label>)}</fieldset> :
          <label className="field"><span className="sr-only">Câu trả lời của bạn</span>
            <textarea rows={8} maxLength={16000} value={draft.text} readOnly={action.busy}
              placeholder="Nêu ý chính, ví dụ và điều kiện áp dụng…" lang={selectedLanguage}
              onChange={e => draft.change(e.target.value)} />
          </label>}
          <div className="split"><span className="small muted">{draft.text.length.toLocaleString('vi')} / 16.000</span>
            <div className="action-row">
              <Button disabled={action.busy || draft.state === 'conflict'} onClick={() => void action.run(() => draft.flush(true))}>Lưu nháp</Button>
              <Button tone="primary" disabled={action.busy || !draft.text.trim() || draft.state === 'conflict'} onClick={() => submit(false)}>Nộp câu trả lời <ArrowRight size={16} /></Button>
            </div>
          </div>
          {draft.state === 'conflict' && <DraftConflict onServer={() => resolve(false)} onKeep={() => resolve(true)} busy={action.busy} />}
          <Problem text={action.error || (draft.state === 'error' ? draft.issue : '')} />
          <div className="sr-only" role="status">{notice}</div>
        </section>
        {opened?.reference && <div className="panel content-panel"><RubricPanel reference={opened.reference} /></div>}
      </div>
      <aside className="stack practice-side">
        <section className="panel content-panel stack">
          <h2>Công cụ luyện tập</h2>
          <Field label="Ngôn ngữ trả lời"><select value={selectedLanguage} onChange={e => setLanguage(e.target.value as 'vi' | 'en')}>
            <option value="vi">Tiếng Việt</option><option value="en">English</option>
          </select></Field>
          <Button tone="secondary" disabled={action.busy || Boolean(opened?.hint)} onClick={() => reveal('hint')}><Lightbulb size={16} /> Xin gợi ý</Button>
          {opened?.hint && <p className="notice hint">{opened.hint}</p>}
          {opened?.nextHint && <details className="details"><summary>Gợi ý tiếp theo</summary><p>{opened.nextHint}</p></details>}
          <Button tone="quiet" disabled={action.busy || Boolean(opened?.reference)} onClick={() => reveal('answer')}><FileText size={16} /> Xem đáp án trước khi nộp</Button>
          <Button tone="quiet" disabled={action.busy || draft.state === 'conflict'} onClick={() => draft.text.trim() ? setSkipping(true) : submit(true)}>Bỏ qua</Button>
        </section>
        <ReviewDate card={question.card} />
        {data.lastAttemptId && <ActionLink href={'/luot-luyen/' + data.lastAttemptId}>Xem lượt luyện gần nhất <ArrowRight size={15} /></ActionLink>}
      </aside>
    </div>
    <Dialog title="Bỏ qua câu hỏi?" open={skipping} onClose={() => setSkipping(false)}>
      <p>Lượt này sẽ được ghi là đã bỏ qua và bản nháp hiện tại sẽ đóng.</p>
      <div className="action-row"><Button onClick={() => setSkipping(false)}>Tiếp tục viết</Button><Button tone="danger" disabled={action.busy} onClick={() => submit(true)}>Bỏ qua câu hỏi</Button></div>
      <Problem text={action.error} />
    </Dialog>
  </div>
}

export function ownerKey(owner: string, kind: string, slug: string) { return ['ip', owner, kind, slug].join(':') }

export function DraftConflict({ onServer, onKeep, busy }: { onServer: () => void; onKeep: () => void; busy: boolean }) {
  return <div className="notice conflict" role="alert">
    <div><strong>Bản nháp trên máy chủ đã thay đổi.</strong><p>Nếu lưu bản đang viết, bản đó sẽ trở thành phiên bản mới nhất.</p></div>
    <div className="action-row"><Button disabled={busy} onClick={onServer}>Dùng bản máy chủ</Button>
      <Button disabled={busy} onClick={onKeep}>Lưu bản đang viết</Button></div>
  </div>
}

function ReviewDate({ card }: { card: Card }) {
  const [due, setDue] = useState(card.due ?? '')
  const [done, setDone] = useState(false)
  const action = useAction()
  return <section className="panel content-panel stack">
    <h2>Lịch ôn</h2>
    <form className="stack" onSubmit={e => {
      e.preventDefault()
      void action.run(async () => {
        await api('/practice/questions/' + card.slug + '/mark', { method: 'PUT', body: { due: due || null, setDue: true } })
        setDone(true)
      })
    }}>
      <Field label="Ngày ôn"><input type="date" value={due} onChange={e => { setDone(false); setDue(e.target.value) }} /></Field>
      <Button type="submit" disabled={action.busy}><CalendarPlus size={16} /> Lưu lịch ôn</Button>
    </form>
    <Problem text={action.error} />
    {done && <span className="success small" role="status"><Check size={16} /> {due ? 'Đã lưu ngày ôn' : 'Đã dùng lại lịch tự động'}</span>}
  </section>
}

export function AttemptRoute({ id }: { id: string }) {
  const { user } = useSession()
  const resource = useResource<Attempt>(user ? '/practice/attempts/' + encodeURIComponent(id) : null)
  if (!user) return <SignInGate detail="Đăng nhập để xem lượt luyện của bạn." />
  if (resource.loading) return <Loading />
  if (!resource.data) return <Problem text={resource.error} retry={resource.reload} />
  return <AttemptView key={id} initial={resource.data} />
}

function AttemptView({ initial }: { initial: Attempt }) {
  const { goal } = useSession()
  const [attempt, setAttempt] = useState(initial)
  const [reference, setReference] = useState<Reference>()
  const [revision, setRevision] = useState('')
  const [revisionOpen, setRevisionOpen] = useState(false)
  const revisionId = useRef(crypto.randomUUID())
  const action = useAction()
  const { question } = attempt
  const next = '/cau-hoi/' + question.card.slug
  const link = '/ghi-chu?new=1&slug=' + question.card.slug + '&topic=' + question.card.topic + '&title=' + encodeURIComponent(question.card.title)
  const base = '/practice/attempts/' + attempt.id
  const previous = useResource<{previous?: Pick<Attempt,'at'|'text'|'language'|'correct'|'id'>}>(base+'/previous')
  const refresh = async () => setAttempt(await api<Attempt>(base))
  return <div className="page practice-page">
    <PageTitle title={question.card.title} description={'Lượt luyện · ' + dateTime(attempt.at, goal.timeZone)} back={[next, 'Quay về câu hỏi']}
      action={attempt.studySessionId ? <ActionLink tone="primary" href={'/phien-hoc/' + attempt.studySessionId}>Tiếp tục phiên học <ArrowRight size={16}/></ActionLink> : <ActionLink href={next}><RotateCcw size={17} /> Luyện lại</ActionLink>} />
    <div className="metadata"><Badge tone={attempt.outcome === 'answered' ? 'green' : 'amber'}>{label('status', attempt.outcome)}</Badge>
      <span>Phiên bản {question.card.version}</span><span>{attempt.language === 'en' ? 'English' : 'Tiếng Việt'}</span>
      {attempt.hintSeen && <span>Đã xem gợi ý</span>}{attempt.answerSeen && <span>Đã xem đáp án trước khi nộp</span>}
    </div>
    <div className="practice-grid">
      <div className="stack">
        <section className="panel content-panel">
          <h2>{attempt.outcome === 'answered' ? 'Câu trả lời đã nộp' : 'Bạn đã bỏ qua câu này'}</h2>
          <p className="muted">{attempt.language === 'en' ? question.englishPrompt : question.prompt}</p>
          {attempt.outcome === 'answered' && <div className="written-answer" lang={attempt.language}>{attempt.text}</div>}
          {typeof attempt.correct === 'boolean' && <p className="notice">{attempt.correct ? 'Đáp án đúng' : 'Đáp án chưa đúng'} · Chấm theo đáp án của đề v{question.card.version}</p>}
          {previous.data?.previous && <details className="details"><summary>So với lần trả lời trước</summary>
            <p className="small muted">{dateTime(previous.data.previous.at, goal.timeZone)} · {previous.data.previous.language === 'en' ? 'English' : 'Tiếng Việt'}</p>
            <p className="written-answer">{previous.data.previous.text}</p><Link className="text-link" href={'/luot-luyen/'+previous.data.previous.id}>Mở lượt trước</Link></details>}
          <Problem text={previous.error} retry={previous.reload}/>
          {attempt.outcome === 'skipped' && <p>Bạn có thể đặt lịch ôn hoặc luyện lại khi sẵn sàng.</p>}
        </section>
        {attempt.outcome === 'answered' && <KnowledgeCheckPanel path={base + '/check'} language={attempt.language} refresh={refresh}/>}
        <section className="panel content-panel stack">
          {reference ? <RubricPanel reference={reference} /> : <>
            <h2>Đối chiếu và tự đánh giá</h2>
            <p className="muted">Mở đáp án để so sánh cách lập luận và xem rubric của câu hỏi.</p>
            <Button onClick={() => void action.run(async () => setReference(await api<Reference>(base + '/reference', { method: 'POST' })))} disabled={action.busy}>Xem đáp án và rubric <ArrowRight size={16} /></Button>
          </>}
          {attempt.outcome === 'answered' && <Ratings rating={attempt.rating} busy={action.busy} change={rating => void action.run(async () => {
            setAttempt(await api<Attempt>(base + '/assessment', { method: 'PUT', body: { rating } }))
          })} />}
          <Problem text={action.error} />
        </section>
        {attempt.outcome === 'answered' && <section className="panel content-panel stack">
          <div className="split"><h2>Bản trả lời cải thiện</h2><Button onClick={() => setRevisionOpen(!revisionOpen)} aria-expanded={revisionOpen}>{revisionOpen ? 'Thu gọn' : 'Viết bản cải thiện'}</Button></div>
          {revisionOpen && <>
            <Field label="Bản cải thiện của bạn"><textarea value={revision} rows={6} maxLength={16000} onChange={e => setRevision(e.target.value)} /></Field>
            <Button tone="primary" disabled={!revision.trim() || action.busy} onClick={() => void action.run(async () => {
              const result = await api<AnswerRevision>(base + '/revisions', { method: 'POST', body: { id: revisionId.current, text: revision } })
              setAttempt(old => ({ ...old, revisions: [...old.revisions.filter(x => x.id !== result.id), result] }))
              revisionId.current = crypto.randomUUID()
              setRevision('')
              setRevisionOpen(false)
            })}>Lưu bản cải thiện</Button>
          </>}
          {attempt.revisions.map((item, index) => <details className="details" key={item.id}><summary>Bản {index + 1} · {dateTime(item.at, goal.timeZone)}</summary><p className="written-answer">{item.text}</p></details>)}
        </section>}
        {attempt.outcome === 'answered' && <AiFeedbackPanel path={base + '/ai-feedback'} refresh={refresh}/>}
      </div>
      <aside className="stack"><section className="panel content-panel"><h2>{label('mastery', question.card.mastery ?? 'learning')}</h2>
        <p className="muted">{question.card.verifiedDays ?? 0} ngày trả lời đúng độc lập trên phiên bản này.</p></section>
        {question.card.reviewReason && <p className="notice">{label('reviewReason', question.card.reviewReason)}</p>}
        {question.card.aiAssessed && <p className="small muted">Đã có nhận xét AI. Nguồn AI được lưu riêng theo rubric.</p>}
        <ReviewDate key={attempt.rating || 'initial'} card={question.card} />
        <Link className="button secondary" href={link}><FileText size={16} /> Thêm ghi chú</Link>
      </aside>
    </div>
  </div>
}

type KnowledgeCheck = {
  prompt: string; englishPrompt: string; choices: string[]; englishChoices: string[]
  choice?: number; correct?: boolean; assisted: boolean; answeredAt?: string; explanation?: string; englishExplanation?: string
}

function KnowledgeCheckPanel({ path, language, refresh }: { path: string; language: string; refresh: () => Promise<void> }) {
  const saved = useResource<{available: boolean; check?: KnowledgeCheck}>(path)
  const [current, setCurrent] = useState<KnowledgeCheck>()
  const [choice, setChoice] = useState<number>()
  const action = useAction()
  const check = current ?? saved.data?.check
  if (saved.loading) return <Loading/>
  if (!saved.data?.available && !check) return <Problem text={saved.error} retry={saved.reload}/>
  return <section className="panel content-panel stack">
    <h2>Kiểm tra vận dụng</h2>
    {!check ? <>
      <p className="muted">Một tình huống ngắn kiểm tra cách áp dụng kiến thức. Làm trước khi mở tài liệu hoặc nhận xét AI để ghi nhận lần trả lời độc lập.</p>
      <Button disabled={action.busy} onClick={() => void action.run(async () => setCurrent(await api<KnowledgeCheck>(path, {method:'POST'})))}>Bắt đầu kiểm tra</Button>
    </> : <>
      <p className="prompt-text" lang={language}>{language === 'en' ? check.englishPrompt : check.prompt}</p>
      <fieldset className="quiz-options" disabled={action.busy || !!check.answeredAt}><legend>Chọn phương án phù hợp</legend>
        {(language === 'en' ? check.englishChoices : check.choices).map((text, i) => <label key={i}><input type="radio" name="knowledge-check"
          checked={(check.choice ?? choice) === i} onChange={() => setChoice(i)}/>{text}</label>)}
      </fieldset>
      {check.answeredAt ? <div role="status"><p className="notice">{check.correct ? 'Vận dụng đúng' : 'Cần luyện lại tình huống này'} · {check.assisted ? 'Có trợ giúp' : 'Trả lời độc lập'}</p>
        <p lang={language}>{language === 'en' ? check.englishExplanation : check.explanation}</p>
        <p className="small muted">Bằng chứng áp dụng cho tình huống này. Dùng rubric bên dưới để đánh giá độ sâu câu tự luận.</p></div> :
        <Button tone="primary" disabled={choice === undefined || action.busy} onClick={() => void action.run(async () => {
          setCurrent(await api<KnowledgeCheck>(path + '/answer', {method:'POST',body:{choice}}))
          await refresh()
        })}>Nộp bài vận dụng</Button>}
    </>}
    <Problem text={action.error || saved.error} retry={saved.reload}/>
  </section>
}

function AiFeedbackPanel({ path, refresh }: { path: string; refresh: () => Promise<void> }) {
  const status = useResource<{ available: boolean }>('/ai/status')
  const saved = useResource<{ feedback?: AiReview }>(path)
  const [newReview, setNew] = useState<AiReview>()
  const action = useAction()
  const review = newReview ?? saved.data?.feedback
  if (status.loading || saved.loading) return <Loading />
  return <section className="panel content-panel stack">
    <div className="split"><h2>Nhận xét AI</h2>{review && <Badge tone="indigo">Nguồn AI · rubric v{review.rubricVersion}</Badge>}</div>
    {review ? <>
      <p className="muted small">{review.provider} · {review.model}. Nhận xét tham khảo theo câu trả lời đã nộp.</p>
      <dl className="rubric">
        {review.body.criteria.map((criterion, i) => <div key={rubricTitles[i]}>
          <dt>{rubricTitles[i]}<br />{criterion.status === 'scored' ? criterion.score + ' / 4' : criterion.status === 'notApplicable' ? 'Không áp dụng' : 'Chưa đủ bằng chứng'}</dt>
          <dd>{criterion.finding}{criterion.evidence && <blockquote>{criterion.evidence}</blockquote>}</dd>
        </div>)}
      </dl>
      {([
        ['Ý đúng', review.body.correct], ['Phần còn thiếu', review.body.missing], ['Phần cần sửa', review.body.incorrect],
        ['Điều kiện áp dụng', review.body.conditions], ['Cách cải thiện', review.body.suggestions],
        ['Lỗi chuyên môn cần sửa trước', review.body.criticalErrors ?? []], ['Diễn đạt và cấu trúc', review.body.expression ?? []],
      ] as const).filter(([, items]) => items.length).map(([title, items]) =>
        <div key={title}><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}
      {review.body.referenceAnswer && <details className="details"><summary>Câu trả lời tham khảo từ AI</summary><p>{review.body.referenceAnswer}</p></details>}
    </> : status.data?.available ? <>
      <p className="muted">Khi yêu cầu, hệ thống gửi câu hỏi, câu trả lời đã nộp và rubric tới OpenAI để lấy nhận xét tham khảo.</p>
      <Button disabled={action.busy} onClick={() => void action.run(async () => {
        setNew(await api<AiReview>(path, { method: 'POST' }))
        await refresh()
      })}>
        {action.busy ? 'Đang nhận xét…' : 'Yêu cầu nhận xét AI'}
      </Button>
    </> : !status.error && <p className="muted">Chưa cấu hình AI. Bạn có thể tự đối chiếu theo rubric.</p>}
    <Problem text={action.error || saved.error || status.error} retry={saved.error ? saved.reload : status.error ? status.reload : undefined} />
  </section>
}
