import { ArrowRight, BookOpen, Braces, CalendarDays, Check, ChevronRight, Clock3, Code2, Database, FileCheck2, GraduationCap, ListTodo, Mic2, RotateCcw, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useResource } from './api'
import type { Dashboard } from './types'
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
  const resource = useResource<Dashboard>('/dashboard')
  const data = resource.data
  if (resource.loading) return <Loading />
  if (!data) return <Problem text={resource.error} retry={resource.reload} />
  const goal = data.goal
  const weekly = goal.minutesPerDay && goal.daysPerWeek ? goal.minutesPerDay * goal.daysPerWeek : 0
  const formattedDay = new Intl.DateTimeFormat('vi', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(data.today + 'T12:00:00Z'))
  const suggested = data.suggestions.find(item => item.path !== data.resume?.path && !data.todayPlan.some(step => step.path === item.path))
  const statItems = [
    { name: 'Lượt tự trả lời', value: data.answers, icon: FileCheck2, tone: 'aspnet', detail: 'Câu đã tự nộp' },
    { name: 'Phiên mock', value: data.completedMocks, icon: Mic2, tone: 'oop', detail: 'Phiên hoàn thành' },
    { name: 'Thời gian học', value: Math.floor(data.activeSeconds / 60) + ' phút', icon: Clock3, tone: 'sql', detail: 'Đồng hồ tự luyện' },
    { name: 'Mục tiêu tuần', value: weekly ? Math.floor(data.weekSeconds / 60) + ' / ' + weekly : 'Chưa đặt', icon: Target, tone: 'efcore', detail: weekly ? 'Phút trong 7 ngày' : 'Phút luyện mỗi tuần' },
  ]
  return <div className="page dashboard">
    <PageTitle title="Tổng quan luyện tập" action={<Link className="text-link" href="/cai-dat"><Target size={16} />{goal.position || 'Thiết lập mục tiêu'}</Link>} />
    <section className="daily-agenda" aria-labelledby="start-title">
      <div className="agenda-main">
        <div className="agenda-time"><CalendarDays size={17} aria-hidden="true"/>{formattedDay}</div>
        <h2 id="start-title">{data.resume ? 'Tiếp tục phiên đang dở' : 'Kế hoạch hôm nay'}</h2>
        <p>{data.resume ? data.resume.label : data.dueCount ? data.dueCount + ' câu đã đến hạn ôn.' :
          !data.studyDay ? 'Hôm nay bạn có thể luyện tự chọn.' :
          goal.minutesPerDay ? 'Quỹ thời gian hôm nay của bạn là ' + goal.minutesPerDay + ' phút.' : 'Chọn quỹ thời gian và bắt đầu một phiên luyện .NET.'}</p>
        <div className="action-row"><ActionLink tone="primary" href={data.resume?.path ?? ('/phien-hoc?mode=' + (data.dueCount ? 'due' : 'new'))}>
          {data.resume ? 'Tiếp tục luyện' : 'Bắt đầu phiên học'} <ArrowRight size={17}/></ActionLink>
          <Link className="text-link" href="/lo-trinh">Lộ trình của tôi <ArrowRight size={15}/></Link></div>
      </div>
      <div className="agenda-side"><BookOpen size={22} aria-hidden="true"/><h3>{suggested?.label ?? 'Ngân hàng câu hỏi'}</h3>
        <p>{suggested?.reason ?? data.questionCount + ' câu hỏi theo chủ đề'}</p>
        <Link className="text-link" href={suggested?.path ?? '/cau-hoi'}>Mở nội dung <ArrowRight size={15}/></Link>
      </div>
    </section>

    <div className="dashboard-columns">
      <section className="panel dashboard-section">
        <div className="panel-heading"><h2>Bài luyện hôm nay</h2><Link className="text-link" href="/lo-trinh">Lộ trình <ArrowRight size={16} /></Link></div>
        {data.todayPlan.length === 0
          ? <Empty title={data.studyDay ? 'Đã hết bài phù hợp với quỹ thời gian' : goal.skipDay === data.today ? 'Hôm nay bạn đã bỏ lịch' : 'Ngày nghỉ theo lịch học'}
            detail="Bạn có thể chọn thêm một bài trong ngân hàng." action={<ActionLink href="/cau-hoi">Chọn câu hỏi</ActionLink>} />
          : <div>{data.todayPlan.map((item, index) => <Link key={item.path} href={item.path} className="study-row">
            <TopicIcon topic={item.topic ?? 'oop'} /><span><strong>{item.label}</strong><small>{item.reason}</small></span>
            {index === 0 ? <ArrowRight size={18} className="row-arrow" /> : <ChevronRight size={18} className="row-arrow" />}
          </Link>)}</div>}
      </section>
      <section className="panel dashboard-section review-panel">
        <div className="panel-heading"><h2>Ôn hôm nay</h2><Badge tone={data.dueCount ? 'amber' : 'neutral'}>{data.dueCount} đến hạn</Badge></div>
        {data.due.length ? <div>{data.due.map(item => <Link className="study-row" key={item.slug} href={'/cau-hoi/' + item.slug}><TopicIcon topic={item.topic} /><span><strong>{item.title}</strong>
          <small>{item.due && shortDate(item.due)}</small></span><ChevronRight size={18} className="row-arrow" /></Link>)}</div>
          : <div className="review-empty"><span className="review-mark" aria-hidden="true"><Check size={21} strokeWidth={2.2} /></span>
            <div><h3>Hôm nay chưa có câu đến hạn</h3><p>Lịch ôn sẽ cập nhật sau mỗi lượt trả lời.</p></div>
          </div>}
        <Link className="review-footer text-link" href="/on-tap"><RotateCcw size={15} /> Mở danh sách ôn <span>{data.weakCount} cần luyện thêm</span><ArrowRight size={15} /></Link>
      </section>
    </div>

    <div className="stat-strip" aria-label="Thống kê của bạn">
      {statItems.map(({ name, value, icon: Icon, tone, detail }) => <div className="stat" key={name}>
        <span className={'topic-icon tone-' + tone} aria-hidden="true"><Icon size={19} strokeWidth={1.85} /></span>
        <div><div className="stat-name">{name}</div><strong>{value}</strong><p>{detail}</p></div>
      </div>)}
    </div>
    <section className="panel dashboard-section topic-section">
      <div className="panel-heading"><div><h2>Chủ đề luyện tập</h2><p className="small muted">{data.answers} lượt trả lời · toàn bộ thời gian</p></div>
        <Link className="text-link" href="/tien-do">Xem tiến độ <ArrowRight size={16} /></Link></div>
      <div className="topic-grid">{data.topics.map(topic => <Link className="topic-row" key={topic.topic} href={'/cau-hoi?topic=' + topic.topic}>
        <TopicIcon topic={topic.topic} /><span><strong>{label('topics', topic.topic)}</strong><small>{topic.practicedQuestions} / {topic.catalogCount} câu đã luyện</small></span>
        <progress aria-label={label('topics', topic.topic) + ' đã luyện'} max={Math.max(1, topic.catalogCount)} value={topic.practicedQuestions} />
      </Link>)}</div>
      <div className="topic-footer"><Link href="/coding">Coding <strong>{data.codingRemaining}</strong> bài cần kiểm chứng độc lập</Link>
        <Link href="/sql">SQL <strong>{data.sqlRemaining}</strong> bài cần kiểm chứng độc lập</Link></div>
    </section>
  </div>
}
