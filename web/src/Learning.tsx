import { useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Bookmark, CalendarDays, Check, ChevronRight, Download, FileText, LogOut, Plus, Star, Trash2 } from 'lucide-react'
import { api, clearPersonalDrafts, useAction, useResource } from './api'
import { TopicIcon } from './Dashboard'
import { ExerciseEmpty } from './Exercises'
import { SignInGate, useSession } from './session'
import type { Card, Dashboard, ExerciseCard, Goal, History, Note, Page, Topic } from './types'
import { label, labels } from './types'
import { ActionLink, Badge, Button, Dialog, Empty, Field, Link, Loading, Options, PageTitle, Pagination, Problem, QuestionCard, Segments, TopicChecks, dateTime, navigate, shortDate } from './ui'

export function Roadmap() {
  const topics = useResource<Topic[]>('/topics')
  const dashboard = useResource<Dashboard>('/dashboard')
  const { goal, setGoal, user } = useSession()
  const action = useAction()
  const [saved, setSaved] = useState('')
  const list = topics.data ?? []
  const defaultOrder = ['Nền tảng', 'Ứng dụng', 'Thực tế'].flatMap(stage => list.filter(x => x.stage === stage).map(x => x.id))
  const order = [...goal.roadmap, ...defaultOrder.filter(x => !goal.roadmap.includes(x))]
  async function save(next: Goal, note: string) {
    await action.run(async () => {
      setGoal(await api<Goal>('/profile', { method: 'PUT', body: next }))
      setSaved(note)
      dashboard.reload()
    })
  }
  function move(index: number, amount: number) {
    const next = [...order]
    ;[next[index], next[index + amount]] = [next[index + amount], next[index]]
    void save({ ...goal, roadmap: next }, 'Đã đổi thứ tự lộ trình.')
  }
  const today = dashboard.data?.today
  const tracks: Record<string, [string, string, number, number]> = {
    intern30: ['Intern .NET · 30 ngày', 'intern', 30, 20], fresher60: ['Fresher .NET · 60 ngày', 'fresher', 60, 30],
    junior90: ['Junior Backend · 90 ngày', 'junior', 90, 45], sprint7: ['Ôn cấp tốc · 7 ngày', goal.level || 'junior', 7, 30],
    sprint14: ['Ôn cấp tốc · 14 ngày', goal.level || 'junior', 14, 30], custom: ['Lộ trình tùy chỉnh', goal.level || 'junior', 0, goal.minutesPerDay ?? 20],
  }
  const track = goal.track ? tracks[goal.track] : null
  return <div className="page narrow">
    <PageTitle title="Lộ trình học" description="Đi từ kiến thức nền đến ứng dụng và tình huống thực tế. Bạn có thể đổi thứ tự theo mục tiêu."
      action={<ActionLink href="/cai-dat"><CalendarDays size={16} /> Thiết lập lịch học</ActionLink>} />
    {(topics.loading || dashboard.loading) && <Loading />}
    <Problem text={topics.error || dashboard.error || action.error} retry={topics.error ? topics.reload : dashboard.error ? dashboard.reload : undefined} />
    {user && <section className="panel content-panel"><Field label="Chọn lộ trình"><select value={goal.track ?? ''} disabled={action.busy || !today}
      onChange={e => { const key = e.target.value; const t = tracks[key]; if (!t || !today) return
        void save({ ...goal, track: key, level: t[1], minutesPerDay: t[3], daysPerWeek: goal.daysPerWeek ?? 5 }, 'Đã cập nhật lộ trình.')
      }}><option value="" disabled>Chọn mục tiêu</option>{Object.entries(tracks).map(([key, t]) => <option key={key} value={key}>{t[0]}</option>)}</select></Field>
      {track && <p className="small muted">{track[0]} · {track[2] > 0 && (dashboard.data?.trackDay ?? 1) > track[2]
        ? 'Đã qua mốc lộ trình' : 'Ngày ' + (dashboard.data?.trackDay ?? 1)}{goal.interviewDate && ' · Phỏng vấn ' + shortDate(goal.interviewDate)}</p>}</section>}
    {today && <section className="panel content-panel plan-strip">
      <div><h2>Kế hoạch hôm nay</h2><p>{goal.skipDay === today ? 'Bạn đã bỏ lịch luyện hôm nay.' : goal.track && !dashboard.data?.studyDay ? 'Ngày nghỉ theo nhịp học đã chọn.'
        : goal.minutesPerDay ? 'Dành ' + goal.minutesPerDay + ' phút cho chủ đề ưu tiên.' : 'Chọn một câu theo lộ trình và dành đủ thời gian để tự trả lời.'}</p></div>
      {user && <Button disabled={action.busy} onClick={() => void save({ ...goal, skipDay: goal.skipDay === today ? null : today },
        goal.skipDay === today ? 'Đã khôi phục lịch hôm nay.' : 'Đã bỏ lịch hôm nay.')}>{goal.skipDay === today ? 'Khôi phục lịch' : 'Bỏ lịch hôm nay'}</Button>}
    </section>}
    {dashboard.data?.studyDay && user && <section className="panel content-panel stack">
      {dashboard.data.todayPlan.map(item=><Link className="study-row" key={item.path} href={item.path}><TopicIcon topic={item.topic ?? 'oop'}/>
        <span><strong>{item.label}</strong><small>{item.reason}</small></span><ArrowRight size={16}/></Link>)}
      {!dashboard.data.todayPlan.length && <p>Hôm nay không còn bài phù hợp với quỹ thời gian đã đặt.</p>}
      <ActionLink tone="primary" href={'/phien-hoc?mode=' + (dashboard.data.dueCount ? 'due' : 'new')}>Bắt đầu buổi học <ArrowRight size={15} /></ActionLink></section>}
    <span className="sr-only" role="status">{saved}</span>
    <section className="panel roadmap-list" aria-label="Các bước luyện">
      {order.map((key, index) => {
        const topic = list.find(x => x.id === key)
        const progress = dashboard.data?.topics.find(x => x.topic === key)
        if (!topic) return null
        const reviewing = goal.reviewTopics.includes(key)
        return <div className="roadmap-row" key={key}>
          <TopicIcon topic={key} />
          <div className="roadmap-content">
            <div className="metadata"><Badge tone={key}>{topic.stage}</Badge><span>{progress?.practicedQuestions ?? 0} / {progress?.catalogCount ?? 0} câu đã tự trả lời</span></div>
            <h2>{topic.name}</h2><p>{topic.check}</p>
            <div className="action-row"><Link className="text-link" href={'/cau-hoi?topic=' + key}>Câu nên luyện <ArrowRight size={15} /></Link>
              <Link className="text-link" href={'/' + (['sql', 'efcore', 'testing'].includes(key) ? 'sql' : 'coding') + '/' + topic.exercise}>Bài áp dụng <ArrowRight size={15} /></Link>
              {user && <Button tone="quiet" aria-pressed={reviewing} disabled={action.busy} onClick={() => void save({
                ...goal, reviewTopics: reviewing ? goal.reviewTopics.filter(x => x !== key) : [...goal.reviewTopics, key],
              }, reviewing ? 'Đã bỏ ưu tiên ôn.' : 'Đã đánh dấu cần ôn.')}>{reviewing ? 'Đang cần ôn' : 'Đánh dấu cần ôn'}</Button>}
            </div>
          </div>
          {user && <div className="reorder">
            <Button tone="quiet" aria-label={'Đưa ' + topic.name + ' lên'} className="icon-button" disabled={action.busy || index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} /></Button>
            <Button tone="quiet" aria-label={'Đưa ' + topic.name + ' xuống'} className="icon-button" disabled={action.busy || index === order.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} /></Button>
          </div>}
        </div>
      })}
    </section>
  </div>
}

export function Reviews({ params }: { params: URLSearchParams }) {
  const { user } = useSession()
  const kind = params.get('tab') ?? 'due'
  const selected = useResource<Card[]>(user && kind !== 'exercises' ? '/reviews?kind=' + encodeURIComponent(kind) : null)
  const exercises = useResource<ExerciseCard[]>(user && kind === 'exercises' ? '/exercises' : null)
  const pending = exercises.data?.filter(x => !x.reviewed) ?? []
  return <div className="page">
    <PageTitle title="Ôn tập" description="Ôn lại câu đến hạn, câu bạn đánh dấu hoặc nội dung cần giải thích rõ hơn."
      action={<ActionLink href="/ghi-chu?important=1"><Bookmark size={16} /> Ghi chú quan trọng</ActionLink>} />
    {!user ? <SignInGate detail="Đăng nhập để xem câu đến hạn và lịch ôn riêng." /> : <>
      <Segments selected={kind} change={x => navigate('/on-tap?tab=' + x, { preserveScroll: true })} title="Danh sách ôn"
        values={[[ 'due', 'Đến hạn' ], [ 'weak', 'Chưa vững' ], [ 'skipped', 'Đã bỏ qua' ], [ 'bookmarked', 'Đã đánh dấu' ],
          [ 'wrong', 'Trả lời sai' ], [ 'planned', 'Sắp tới' ], [ 'exercises', 'Bài chưa đối chiếu' ]]} />
      {selected.data && selected.data.length > 0 && <ActionLink tone="primary" href={'/cau-hoi/' + selected.data[0].slug}>Ôn ngay câu đầu tiên <ArrowRight size={16} /></ActionLink>}
      {(selected.loading || exercises.loading) && <Loading />}
      <Problem text={selected.error} retry={selected.reload} /><Problem text={exercises.error} retry={exercises.reload} />
      {selected.data && (selected.data.length ? <div className="card-grid">{selected.data.map(item => <QuestionCard key={item.slug} item={item}>
        <Link className="text-link" href={'/cau-hoi/' + item.slug}>{item.due ? shortDate(item.due) : 'Luyện lại'} <ArrowRight size={15} /></Link>
      </QuestionCard>)}</div> : <div className="panel"><Empty title={kind === 'due' ? 'Chưa có câu đến hạn' : 'Danh sách này đang trống'}
        detail="Mở một câu để đặt lịch ôn, đánh dấu hoặc tự đánh giá sau khi luyện." action={<ActionLink href="/cau-hoi">Xem ngân hàng</ActionLink>} /></div>)}
      {exercises.data && <div className="panel content-panel">{pending.length ? pending.map(x => <Link key={x.slug} className="study-row" href={'/' + x.kind + '/' + x.slug}>
        <TopicIcon topic={x.topic} /><span><strong>{x.title}</strong><small>{x.hasDraft ? 'Có bản nháp' : 'Chưa luyện'}</small></span><ChevronRight size={16} className="row-arrow" />
      </Link>) : <ExerciseEmpty />}</div>}
    </>}
  </div>
}

export function Notes({ params }: { params: URLSearchParams }) {
  const { user, goal } = useSession()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const [query, setQuery] = useState(search)
  const [page, setPage] = useState(1)
  const [topic, setTopic] = useState('')
  const [important, setImportant] = useState(params.get('important') === '1')
  const [edit, setEdit] = useState<Note | null>(() => params.get('new') === '1' ? newNote(params) : null)
  const [removing, setRemoving] = useState<Note | null>(null)
  const [notice, setNotice] = useState('')
  const action = useAction()
  const resource = useResource<Page<Note>>(user ? '/notes?' + new URLSearchParams({
    page: String(page), search: query, ...(topic ? { topic } : {}), ...(important ? { important: 'true' } : {}),
  }) : null)
  return <div className="page narrow">
    <PageTitle title="Ghi chú" description="Giữ lại ví dụ, câu trả lời đã cải thiện và điều bạn muốn nhớ khi ôn."
      action={user && <Button tone="primary" onClick={() => { action.clearError(); setEdit(newNote()) }}><Plus size={17} /> Ghi chú mới</Button>} />
    {!user ? <SignInGate detail="Ghi chú thuộc tài khoản của bạn. Đăng nhập để lưu và tìm lại." /> : <>
      {edit && <section className="panel content-panel stack">
        <div className="split"><h2>{edit.revision ? 'Sửa ghi chú' : 'Ghi chú mới'}</h2>{edit.slug && <Link href={'/cau-hoi/' + edit.slug} className="text-link">Câu hỏi đính kèm <ChevronRight size={15} /></Link>}</div>
        <form className="stack" onSubmit={e => {
          e.preventDefault()
          void action.run(async () => {
            await api('/notes/' + edit.id, { method: 'PUT', body: {
              title: edit.title, text: edit.text, slug: edit.slug ?? null, topic: edit.topic || null, important: edit.important, revision: edit.revision,
            } })
            setEdit(null)
            setNotice('Đã lưu ghi chú.')
            if (params.get('new')) navigate('/ghi-chu', { replace: true, preserveScroll: true })
            resource.reload()
          })
        }}>
          <Field label="Tiêu đề"><input required maxLength={160} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Nội dung"><textarea required maxLength={12000} rows={6} value={edit.text} onChange={e => setEdit({ ...edit, text: e.target.value })} /></Field>
          <Field label="Chủ đề"><select value={edit.topic ?? ''} onChange={e => setEdit({ ...edit, topic: e.target.value })}>
            <option value="">Ghi chú chung</option><Options values={labels.topics} />
          </select></Field>
          <label className="check-chip"><input type="checkbox" checked={edit.important} onChange={e => setEdit({ ...edit, important: e.target.checked })} /> Ghi chú quan trọng</label>
          <div className="action-row"><Button type="submit" tone="primary" disabled={action.busy}>Lưu ghi chú</Button>
            <Button tone="quiet" onClick={() => { setEdit(null); action.clearError() }}>Hủy</Button></div>
          <Problem text={action.error} />
        </form>
      </section>}
      <form className="panel content-panel action-row notes-filters" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search.trim()) }}>
        <Field label="Tìm ghi chú"><input value={search} maxLength={120} placeholder="Tiêu đề hoặc nội dung…" onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault() }} /></Field>
        <Field label="Chủ đề"><select value={topic} onChange={e => { setPage(1); setTopic(e.target.value) }}><option value="">Tất cả</option><Options values={labels.topics} /></select></Field>
        <label className="check-chip"><input type="checkbox" checked={important} onChange={e => { setPage(1); setImportant(e.target.checked) }} /> Quan trọng</label>
        <Button type="submit">Tìm kiếm</Button>
      </form>
      <span className="success small" role="status">{notice}</span>
      {resource.loading && <Loading />}
      <Problem text={resource.error} retry={resource.reload} />
      {resource.data && (resource.data.items.length
        ? <section className="panel note-list">{resource.data.items.map(note => <article className="note-row" key={note.id}>
          <div className="metadata">{note.important && <Badge tone="amber"><Star size={14} /> Quan trọng</Badge>}
            {note.topic && <Badge tone={note.topic}>{label('topics', note.topic)}</Badge>}
            {note.updatedAt && <span>{dateTime(note.updatedAt, goal.timeZone)}</span>}</div>
          <h2>{note.title}</h2><p className="written-answer">{note.text}</p>
          <div className="action-row">
            {note.slug && <Link className="text-link" href={'/cau-hoi/' + note.slug}>Câu hỏi <ArrowRight size={15} /></Link>}
            <Button tone="quiet" onClick={() => { action.clearError(); setEdit(note); window.scrollTo(0, 0) }}>Sửa</Button>
            <Button tone="quiet" onClick={() => { action.clearError(); setRemoving(note) }}><Trash2 size={16} /> Xóa</Button>
          </div>
        </article>)}</section> : <div className="panel"><Empty title="Chưa có ghi chú phù hợp" detail="Thử bỏ bộ lọc hoặc thêm một ghi chú sau khi luyện."
          action={<Button onClick={() => setEdit(newNote())}>Tạo ghi chú</Button>} icon={<FileText size={22} />} /></div>)}
      {resource.data && <Pagination page={resource.data.page} size={resource.data.pageSize} total={resource.data.total} change={setPage} />}
    </>}
    <Dialog title="Xóa ghi chú?" open={Boolean(removing)} onClose={() => setRemoving(null)}>
      <p>{removing?.title}</p><div className="action-row"><Button onClick={() => setRemoving(null)}>Giữ ghi chú</Button>
        <Button tone="danger" disabled={action.busy} onClick={() => void action.run(async () => {
          if (!removing) return
          await api('/notes/' + removing.id + '?revision=' + removing.revision, { method: 'DELETE' })
          setRemoving(null)
          setNotice('Đã xóa ghi chú.')
          resource.reload()
        })}>Xóa ghi chú</Button></div><Problem text={action.error} />
    </Dialog>
  </div>
}

function newNote(params?: URLSearchParams): Note {
  return { id: crypto.randomUUID(), title: params?.get('title') ?? '', text: '', topic: params?.get('topic') ?? undefined,
    slug: params?.get('slug') ?? undefined, important: false, revision: 0 }
}

export function Progress({ params }: { params: URLSearchParams }) {
  const { user, goal } = useSession()
  const dashboard = useResource<Dashboard>(user ? '/dashboard' : null)
  const tab = params.get('tab') ?? ''
  const kind = ['interview','coding','sql'].includes(tab) ? tab : 'practice'
  const page = params.get('page') ?? '1'
  const history = useResource<Page<History>>(user ? '/history?kind=' + kind + '&page=' + encodeURIComponent(page) : null)
  const d = dashboard.data
  const [period, setPeriod] = useState('7')
  const periodDays = period === '7' ? d?.week : d?.month
  return <div className="page">
    <PageTitle title="Tiến độ" description="Xem lượt luyện đã ghi nhận, tự đánh giá và xu hướng theo chủ đề." />
    {!user ? <SignInGate detail="Đăng nhập để xem lịch sử và dữ liệu học của chính bạn." /> : <>
      {dashboard.loading && <Loading />}<Problem text={dashboard.error} retry={dashboard.reload} />
      {d && <div className="dashboard-columns">
        <section className="panel content-panel stack">
          <div className="split"><h2>Lịch hoạt động</h2><Segments title="Kỳ báo cáo" selected={period} change={setPeriod} values={[[ '7', '7 ngày' ], [ '30', '30 ngày' ]]} /></div>
          <p className="muted small">{shortDate(periodDays![0].date)} – {shortDate(d.today)} · {periodDays!.reduce((sum, x) => sum + x.answers, 0)} lượt trả lời · {d.streak} ngày liên tiếp</p>
          <div className="heatmap">{periodDays!.map(day => <div key={day.date} className={'heat-cell heat-' + Math.min(3, day.answers + day.completedMocks)} title={shortDate(day.date) + ' · ' + day.answers + ' lượt và ' + day.completedMocks + ' phiên mock'}>
            <span>{day.date.slice(-2)}</span><small>{day.answers + day.completedMocks}<span className="sr-only"> hoạt động ngày {shortDate(day.date)}</span></small>
          </div>)}</div>
          <p className="small muted">Chuỗi ngày tính khi có lượt tự trả lời hoặc phiên mock hoàn thành có câu trả lời, theo múi giờ {goal.timeZone}.</p>
          <details className="details"><summary>Kết quả trắc nghiệm theo ngày</summary>
            {periodDays?.some(d=>d.objective) ? <div className="result-table"><table><thead><tr><th>Ngày</th><th>Trả lời đúng</th><th>Lượt chấm</th></tr></thead>
              <tbody>{periodDays.filter(d=>d.objective).map(d=><tr key={d.date}><td>{shortDate(d.date)}</td><td>{d.correct}</td><td>{d.objective}</td></tr>)}</tbody></table></div>
              : <p className="small muted">Chưa có lượt trắc nghiệm trong kỳ này.</p>}</details>
        </section>
        <section className="panel content-panel stack">
          <h2>Theo chủ đề</h2>
          <p className="small muted">Khá vững từ hai ngày trả lời đúng trắc nghiệm độc lập trên cùng phiên bản. Tự tin khi trả lời tự luận được lưu riêng trong lịch sử.</p>
          <ul className="lined-list topic-progress">{d.topics.map(x => <li key={x.topic}><span>{label('topics', x.topic)}</span><span>{x.answers} lượt · {x.confidentQuestions} vững</span></li>)}</ul>
        </section>
      </div>}
      <section className="panel content-panel stack">
        <div className="split"><h2>Lịch sử</h2><Segments title="Loại hoạt động" selected={kind} change={x => navigate('/tien-do?tab=' + x, { preserveScroll: true })}
          values={[[ 'practice', 'Tự luyện' ], [ 'interview', 'Phỏng vấn' ], ['coding','Nháp C#'], ['sql','Nháp SQL']]} /></div>
        {history.loading && <Loading />}<Problem text={history.error} retry={history.reload} />
        {history.data && (history.data.items.length ? <>
          <p className="muted small">{history.data.total} bản ghi</p>
          <div>{history.data.items.map(item => <Link className="study-row" href={item.path} key={item.id}>
            <TopicIcon topic={item.topic || 'oop'} /><span><strong>{kind === 'interview' ? label('preset', item.label) : item.label}</strong>
              <small>{dateTime(item.at, goal.timeZone)} · {item.assessmentSource}{item.hasAiFeedback ? ' · Có nhận xét AI' : ''}{item.version ? ' · v' + item.version : ''}{item.revisions ? ' · ' + item.revisions + ' bản cải thiện' : ''}</small></span>
            <Badge tone={item.rating ? 'indigo' : 'neutral'}>{item.rating ? label('rating', item.rating) : item.status === 'reviewed' ? 'Tự đối chiếu' : item.status === 'draft' ? 'Đã lưu nháp' : label('status', item.status)}</Badge>
            <ChevronRight className="row-arrow" size={16} />
          </Link>)}</div>
          <Pagination page={history.data.page} size={history.data.pageSize} total={history.data.total} change={x => navigate('/tien-do?tab=' + kind + '&page=' + x, { preserveScroll: true })} />
        </> : <Empty title="Chưa có hoạt động đã lưu" detail="Sau khi nộp câu trả lời hoặc bắt đầu một phiên phỏng vấn, bạn sẽ thấy lịch sử ở đây."
          action={<ActionLink href={kind === 'interview' ? '/phong-van' : kind === 'practice' ? '/cau-hoi' : '/'+kind}>Bắt đầu luyện</ActionLink>} />)}
      </section>
    </>}
  </div>
}

export function Settings() {
  const { user, setUser, setGoal } = useSession()
  const resource = useResource<Goal>(user ? '/profile' : null)
  const action = useAction()
  const [confirm, setConfirm] = useState(false)
  const [password, setPassword] = useState('')
  return <div className="page narrow">
    <PageTitle title="Cài đặt" description="Đặt hoặc thay đổi mục tiêu, lịch học và ngôn ngữ trả lời của bạn." />
    {!user ? <SignInGate detail="Bạn có thể mở ngân hàng ngay. Đăng nhập nếu muốn lưu mục tiêu và lịch học." /> : <>
      {resource.loading && <Loading />}<Problem text={resource.error} retry={resource.reload} />
      {resource.data && <GoalForm initial={resource.data} save={setGoal} />}
      <section className="panel content-panel stack">
        <h2>Tài khoản và dữ liệu</h2><p className="muted">{user.displayName} · {user.email}</p>
        <div className="action-row">
          <a className="button secondary" href="/api/profile/export" download><Download size={16} /> Tải dữ liệu JSON</a>
          <Button disabled={action.busy} onClick={() => void action.run(async () => {
            await api('/auth/logout', { method: 'POST' }); setUser(null); navigate('/')
          })}><LogOut size={16} /> Đăng xuất</Button>
          <Button tone="quiet" disabled={action.busy} onClick={() => { action.clearError(); setPassword(''); setConfirm(true) }}><Trash2 size={16} /> Xóa tài khoản</Button>
        </div>
        {!confirm && <Problem text={action.error} />}
      </section>
      <Dialog title="Xóa tài khoản?" open={confirm} onClose={() => setConfirm(false)}>
        <p>Thao tác này xóa hồ sơ, bản nháp, ghi chú và lịch sử luyện tập của bạn. Bạn có thể tải bản sao trước khi tiếp tục.</p>
        <form className="stack" onSubmit={e => {
          e.preventDefault()
          void action.run(async () => {
            await api('/profile/account/delete', { method: 'POST', body: { password } })
            clearPersonalDrafts(user.id)
            setConfirm(false)
            setUser(null)
            navigate('/')
          })
        }}>
          <Field label="Xác nhận mật khẩu"><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></Field>
          <div className="action-row"><Button onClick={() => setConfirm(false)}>Giữ tài khoản</Button><Button tone="danger" type="submit" disabled={action.busy}>Xóa dữ liệu cá nhân</Button></div>
          <Problem text={action.error} />
        </form>
      </Dialog>
    </>}
  </div>
}

function GoalForm({ initial, save }: { initial: Goal; save: (next: Goal) => void }) {
  const [goal, set] = useState(initial)
  const [saved, setSaved] = useState(false)
  const action = useAction()
  return <section className="panel content-panel stack"><h2>Mục tiêu luyện tập</h2>
    <form className="stack" onSubmit={e => {
      e.preventDefault()
      void action.run(async () => {
        const updated = await api<Goal>('/profile', { method: 'PUT', body: goal })
        set(updated)
        save(updated)
        setSaved(true)
      })
    }} onChange={() => setSaved(false)}>
      <div className="form-grid">
        <Field label="Vị trí muốn ứng tuyển"><input value={goal.position} maxLength={100} placeholder=".NET Backend Developer" onChange={e => set({ ...goal, position: e.target.value })} /></Field>
        <Field label="Mức mục tiêu"><select value={goal.level ?? ''} onChange={e => set({ ...goal, level: e.target.value || null })}><option value="">Chưa chọn</option><Options values={labels.level} /></select></Field>
        <Field label="Ngày dự kiến phỏng vấn"><input type="date" value={goal.interviewDate ?? ''} onChange={e => set({ ...goal, interviewDate: e.target.value || null })} /></Field>
        <Field label="Ngôn ngữ mặc định"><select value={goal.language} onChange={e => set({ ...goal, language: e.target.value as Goal['language'] })}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></Field>
        <Field label="Phút học mỗi ngày"><input type="number" min={1} max={480} value={goal.minutesPerDay ?? ''} onChange={e => set({ ...goal, minutesPerDay: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Ngày luyện mỗi tuần"><input type="number" min={1} max={7} value={goal.daysPerWeek ?? ''} onChange={e => set({ ...goal, daysPerWeek: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Múi giờ" full><input list="practice-timezones" required maxLength={80} value={goal.timeZone} onChange={e => set({ ...goal, timeZone: e.target.value })} />
          <datalist id="practice-timezones">{['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'UTC', 'Europe/London', 'America/New_York'].map(x => <option key={x} value={x} />)}</datalist>
        </Field>
      </div>
      <TopicChecks legend="Chủ đề ưu tiên" value={goal.topics} change={topics => set({ ...goal, topics })} />
      <div className="action-row"><Button tone="primary" type="submit" disabled={action.busy}>Lưu mục tiêu</Button>
        {saved && <span className="success" role="status"><Check size={16} /> Đã lưu mục tiêu</span>}</div>
      <Problem text={action.error} />
    </form>
  </section>
}
