import { ArrowDownRight, ArrowRight, BookOpen, Braces, CalendarDays, Check, ChevronRight, Clock3, Code2, Database, FileCheck2, GraduationCap, ListTodo, Mic2, RotateCcw, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useResource } from './api'
import { useSession } from './session'
import type { Dashboard, Question } from './types'
import { label } from './types'
import { ActionLink, Badge, Empty, Link, Loading, PageTitle, Problem, shortDate } from './ui'

export const topicIcons: Record<string, LucideIcon> = {
  csharp: Code2, oop: Braces, linq: ListTodo, aspnet: BookOpen, efcore: Database, sql: Database, algorithms: GraduationCap, testing: FileCheck2,
}

export function TopicIcon({ topic, size = 19 }: { topic: string; size?: number }) {
  const Icon = topicIcons[topic] ?? Target
  return <span className={'topic-icon tone-' + topic} aria-hidden="true"><Icon size={size} strokeWidth={1.85} /></span>
}

export function DashboardPage() {
  const { user } = useSession()
  const resource = useResource<Dashboard>('/dashboard')
  const data = resource.data
  const focus = data?.resume ?? data?.suggestions.find(x => x.path.startsWith('/cau-hoi/'))
  const feature = useResource<Question>(focus?.path.startsWith('/cau-hoi/') ? '/questions/' + focus.path.split('/').pop() : null)
  if (resource.loading) return <Loading />
  if (!data) return <Problem text={resource.error} retry={resource.reload} />
  const goal = data.goal
  const weekly = goal.minutesPerDay && goal.daysPerWeek ? goal.minutesPerDay * goal.daysPerWeek : 0
  const formattedDay = new Intl.DateTimeFormat('vi', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(data.today + 'T12:00:00Z'))
  const otherSuggestions = data.suggestions.filter(item => item.path !== focus?.path)
  const statItems = [
    { name: 'Lượt tự trả lời', value: data.answers, icon: FileCheck2, tone: 'aspnet', detail: 'Câu đã tự nộp' },
    { name: 'Phiên mock', value: data.completedMocks, icon: Mic2, tone: 'oop', detail: 'Phiên hoàn thành' },
    { name: 'Thời gian học', value: Math.floor(data.activeSeconds / 60) + ' phút', icon: Clock3, tone: 'sql', detail: 'Đồng hồ tự luyện' },
    { name: 'Mục tiêu tuần', value: weekly ? Math.floor(data.weekSeconds / 60) + ' / ' + weekly : 'Chưa đặt', icon: Target, tone: 'efcore', detail: weekly ? 'Phút trong 7 ngày' : 'Phút luyện mỗi tuần' },
  ]
  return <div className="page dashboard">
    <PageTitle title="Tổng quan luyện tập" description={user ? 'Xin chào, ' + user.displayName + '. Chọn một việc để học tiếp hôm nay.' : 'Tự trả lời, đối chiếu và luyện lại cho buổi phỏng vấn .NET tiếp theo.'}
      action={<span className="date-pill"><CalendarDays size={17} aria-hidden="true" />{formattedDay[0].toLocaleUpperCase('vi') + formattedDay.slice(1)}</span>} />

    <section className="start-panel" aria-labelledby="start-title">
      <div className="start-copy">
        <div className="start-meta"><Target size={17} aria-hidden="true" />
          {goal.position || label('level', goal.level) || 'Mục tiêu phỏng vấn .NET'}
        </div>
        <h2 id="start-title">{data.resume ? 'Tiếp tục phiên đang dở' : focus?.label ?? 'Bắt đầu với ngân hàng câu hỏi'}</h2>
        <p>{data.resume ? focus?.label : feature.data?.prompt ?? 'Chọn một chủ đề và thử giải thích theo cách của bạn.'}</p>
        <div className="action-row">
          <ActionLink tone="primary" className="start-button" href={focus?.path ?? '/cau-hoi'}>{data.resume ? 'Tiếp tục luyện' : 'Bắt đầu luyện'} <ArrowRight size={18} /></ActionLink>
          <Link className="start-link" href="/cai-dat">{goal.position ? 'Sửa mục tiêu' : 'Đặt mục tiêu'} <ArrowDownRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
      {feature.data?.code ? <div className="hero-code">
        <div className="hero-code-head"><Code2 size={16} aria-hidden="true" /> Program.cs <span>C#</span></div>
        <pre><code>{feature.data.code.split('\n').map((line, index) => <span className="hero-line" key={line + index}>
          <span className="line-number" aria-hidden="true">{index + 1}</span><span>{line.split(/(\.Add\w+|<[^>]+>)/).map((part, i) =>
            <span key={i} className={part.startsWith('.Add') ? 'code-method' : part.startsWith('<') ? 'code-generic' : undefined}>
              {part.startsWith('.Add') && <wbr />}{part}
            </span>)}</span>
        </span>)}</code></pre>
        <span className="hero-code-foot"><Clock3 size={13} aria-hidden="true" /> {feature.data.card.minutes} phút <span>·</span> {label('topics', feature.data.card.topic)}</span>
      </div> : <div className="start-catalog"><BookOpen size={25} strokeWidth={1.7} aria-hidden="true" />
        <strong>{data.questionCount} câu hỏi</strong>
        <Link href="/cau-hoi">Xem ngân hàng <ArrowRight size={15} /></Link>
      </div>}
    </section>

    <div className="stat-strip" aria-label="Thống kê của bạn">
      {statItems.map(({ name, value, icon: Icon, tone, detail }) => <div className="stat" key={name}>
        <span className={'topic-icon tone-' + tone} aria-hidden="true"><Icon size={19} strokeWidth={1.85} /></span>
        <div><div className="stat-name">{name}</div><strong>{value}</strong><p>{detail}</p></div>
      </div>)}
    </div>
    <div className="dashboard-columns">
      <section className="panel dashboard-section">
        <div className="panel-heading"><h2>Học tiếp</h2><Link className="text-link" href="/lo-trinh">Lộ trình <ArrowRight size={16} /></Link></div>
        {goal.skipDay === data.today
          ? <Empty title="Hôm nay bạn đã bỏ lịch" detail="Bạn vẫn có thể mở ngân hàng câu hỏi để luyện theo thời gian của mình." action={<ActionLink href="/cau-hoi">Câu hỏi</ActionLink>} />
          : <div>{(otherSuggestions.length > 0 ? otherSuggestions : data.suggestions).map((item, index) => <Link key={item.path} href={item.path} className="study-row">
            <TopicIcon topic={item.topic ?? 'oop'} /><span><strong>{item.label}</strong><small>{item.reason}</small></span>
            {index === 0 ? <ArrowRight size={18} className="row-arrow" /> : <ChevronRight size={18} className="row-arrow" />}
          </Link>)}</div>}
      </section>
      <section className="panel dashboard-section review-panel">
        <div className="panel-heading"><h2>Ôn hôm nay</h2><Badge tone={data.dueCount ? 'amber' : 'neutral'}>{data.dueCount} đến hạn</Badge></div>
        {data.due.length ? <div>{data.due.map(item => <Link className="study-row" key={item.slug} href={'/cau-hoi/' + item.slug}><TopicIcon topic={item.topic} /><span><strong>{item.title}</strong>
          <small>{item.due && shortDate(item.due)}</small></span><ChevronRight size={18} className="row-arrow" /></Link>)}</div>
          : <div className="review-empty"><span className="review-mark" aria-hidden="true"><Check size={21} strokeWidth={2.2} /></span>
            <div><h3>Hôm nay chưa có câu đến hạn</h3><p>Đặt ngày ôn cho một câu hoặc tự đánh giá sau khi luyện.</p></div>
          </div>}
        <Link className="review-footer text-link" href="/on-tap"><RotateCcw size={15} /> Danh sách ôn <span>{data.weakCount} cần luyện thêm</span><ArrowRight size={15} /></Link>
      </section>
    </div>

    <section className="panel dashboard-section topic-section">
      <div className="panel-heading"><div><h2>Chủ đề luyện tập</h2><p className="small muted">{data.answers} lượt trả lời · toàn bộ thời gian</p></div>
        <Link className="text-link" href="/tien-do">Xem tiến độ <ArrowRight size={16} /></Link></div>
      <div className="topic-grid">{data.topics.map(topic => <Link className="topic-row" key={topic.topic} href={'/cau-hoi?topic=' + topic.topic}>
        <TopicIcon topic={topic.topic} /><span><strong>{label('topics', topic.topic)}</strong><small>{topic.practicedQuestions} / {topic.catalogCount} câu đã luyện</small></span>
        <progress aria-label={label('topics', topic.topic) + ' đã luyện'} max={Math.max(1, topic.catalogCount)} value={topic.practicedQuestions} />
      </Link>)}</div>
      <div className="topic-footer"><Link href="/coding">Coding <strong>{data.codingRemaining}</strong> bài chờ đối chiếu</Link>
        <Link href="/sql">SQL <strong>{data.sqlRemaining}</strong> bài chờ đối chiếu</Link></div>
    </section>
  </div>
}
