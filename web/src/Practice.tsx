import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bookmark, CalendarPlus, Check, Clock3, FileText, Lightbulb, RotateCcw } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { useDraft } from './draft'
import { SignInGate, useSession } from './session'
import { label } from './types'
import { rubricTitles } from './types'
import type { AiReview, AnswerRevision, Attempt, Card, DraftCursor, PracticeData, PracticeDraft, Question, Reference } from './types'
import { ActionLink, Badge, Button, CodeBlock, Dialog, Difficulty, Field, Link, Loading, PageTitle, Problem, Ratings, RubricPanel, dateTime, navigate, timeText } from './ui'

export function PracticeRoute({ slug }: { slug: string }) {
  const { user } = useSession()
  const segment = encodeURIComponent(slug)
  const resource = useResource<PracticeData | Question>(user ? '/practice/questions/' + segment : '/questions/' + segment)
  if (resource.loading) return <Loading />
  if (!resource.data) return <Problem text={resource.error} retry={resource.reload} />
  if ('question' in resource.data && user) return <QuestionEditor initial={resource.data} owner={user.id} key={slug} />
  const question = resource.data as Question
  return <div className="page narrow">
    <QuestionTitle question={question} /><div className="panel content-panel"><Prompt question={question} language="vi" /></div>
    <SignInGate detail="Đăng nhập để tự trả lời, lưu nháp, xem đáp án và đặt lịch ôn." />
  </div>
}

function QuestionTitle({ question, action }: { question: Question; action?: React.ReactNode }) {
  const { card } = question
  return <>
    <PageTitle title={card.title} back={['/cau-hoi', 'Ngân hàng câu hỏi']} action={action} />
    <div className="metadata">
      <Badge tone={card.topic}>{label('topics', card.topic)}</Badge><Difficulty value={card.difficulty} />
      <span>{label('level', card.level)}</span><span><Clock3 size={15} aria-hidden="true" />{card.minutes} phút</span>
      {card.technology && <span>{card.technology}</span>}
    </div>
  </>
}
function Prompt({ question, language }: { question: Question; language: string }) {
  return <>
    <h2>Câu hỏi</h2>
    <p className="prompt-text" lang={language}>{language === 'en' ? question.englishPrompt : question.prompt}</p>
    {language === 'vi' && question.context && <p className="muted">{question.context}</p>}
    {question.code && <CodeBlock language="C#">{question.code}</CodeBlock>}
    <div className="tag-row">{question.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
  </>
}
function sameCursor(a: DraftCursor, b: DraftCursor) {
  return a.version === b.version && a.revision === b.revision && (a.revision === 0 || a.id === b.id)
}
const newCursor = (version: number): DraftCursor => ({ id: crypto.randomUUID(), version, revision: 0 })

function QuestionEditor({ initial, owner }: { initial: PracticeData; owner: string }) {
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
  const base = '/practice/questions/' + question.card.slug
  const fresh = useRef(newCursor(question.card.version))
  const draft = useDraft(ownerKey(owner, 'question', question.card.slug),
    { stamp: initial.draft?.cursor ?? fresh.current, text: initial.draft?.text ?? '' }, async snapshot => {
      const saved = await api<PracticeDraft>(base + '/draft', { method: 'PATCH', body: { cursor: snapshot.stamp, text: snapshot.text } })
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
      const result = await api<PracticeDraft>(base + '/reveal', { method: 'POST', body: { cursor, kind } })
      draft.accept({ stamp: result.cursor, text: result.text }, true)
      setOpened(result)
    })
  }
  function submit(skip: boolean) {
    void action.run(async () => {
      const cursor = await draft.flush()
      const attempt = await api<Attempt>(base + '/submit', { method: 'POST',
        body: { cursor, language: selectedLanguage, skip, activeSeconds: seconds } })
      draft.discard()
      setTimer(false)
      setSkipping(false)
      navigate('/luot-luyen/' + attempt.id)
    })
  }
  function resolve(keep: boolean) {
    void action.run(async () => {
      const remote = await api<PracticeData>(base)
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
            <Button onClick={toggleTimer} disabled={action.busy} aria-pressed={timer}><Clock3 size={16} /> {timer || seconds ? timeText(seconds) : 'Bấm giờ'}</Button>
          </div>
          <label className="field"><span className="sr-only">Câu trả lời của bạn</span>
            <textarea rows={8} maxLength={16000} value={draft.text} readOnly={action.busy}
              placeholder="Nêu ý chính, ví dụ và điều kiện áp dụng…" lang={selectedLanguage}
              onChange={e => draft.change(e.target.value)} />
          </label>
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
    {done && <span className="success small" role="status"><Check size={16} /> {due ? 'Đã lưu ngày ôn' : 'Đã xóa ngày ôn'}</span>}
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
  return <div className="page practice-page">
    <PageTitle title={question.card.title} description={'Lượt luyện · ' + dateTime(attempt.at, goal.timeZone)} back={[next, 'Quay về câu hỏi']}
      action={<ActionLink href={next}><RotateCcw size={17} /> Luyện lại</ActionLink>} />
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
          {attempt.outcome === 'skipped' && <p>Bạn có thể đặt lịch ôn hoặc luyện lại khi sẵn sàng.</p>}
        </section>
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
        {attempt.outcome === 'answered' && <AiFeedbackPanel path={base + '/ai-feedback'} />}
      </div>
      <aside className="stack"><ReviewDate key={attempt.rating || 'initial'} card={question.card} />
        <Link className="button secondary" href={link}><FileText size={16} /> Thêm ghi chú</Link>
      </aside>
    </div>
  </div>
}

function AiFeedbackPanel({ path }: { path: string }) {
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
      ] as const).filter(([, items]) => items.length).map(([title, items]) =>
        <div key={title}><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>)}
    </> : status.data?.available ? <>
      <p className="muted">Khi yêu cầu, hệ thống gửi câu hỏi, câu trả lời đã nộp và rubric tới OpenAI để lấy nhận xét tham khảo.</p>
      <Button disabled={action.busy} onClick={() => void action.run(async () => setNew(await api<AiReview>(path, { method: 'POST' })))}>
        {action.busy ? 'Đang nhận xét…' : 'Yêu cầu nhận xét AI'}
      </Button>
    </> : !status.error && <p className="muted">Chưa cấu hình AI. Bạn có thể tự đối chiếu theo rubric.</p>}
    <Problem text={action.error || saved.error || status.error} retry={saved.error ? saved.reload : status.error ? status.reload : undefined} />
  </section>
}
