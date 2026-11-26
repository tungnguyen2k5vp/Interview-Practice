import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, ArrowRight, BookOpen, Braces, ChevronRight, Code2, Database, LayoutDashboard, Menu, Mic, Moon, NotebookPen, RotateCcw, Route, Search, Settings2, ShieldCheck, Sun, Timer, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '@fontsource-variable/lexend'
const AdminRoute = lazy(() => import('./Admin').then(m => ({default: m.AdminRoute})))
const Preparation = lazy(() => import('./Preparation').then(m => ({default: m.Preparation})))
import { Bank } from './Bank'
import { DashboardPage } from './Dashboard'
import { ExerciseList, ExerciseRoute } from './Exercises'
import { InterviewRoute, InterviewSetup } from './Interview'
import { Notes, Progress, Reviews, Roadmap, Settings } from './Learning'
import { AttemptRoute, PracticeRoute } from './Practice'
import { StudyRoute, StudyStart } from './Study'
import { SessionProvider, SignIn, signInLink, useSession } from './session'
import { ActionLink, Button, Dialog, Empty, Field, Link, Loading, Problem, navigate, useLocation } from './ui'
import './styles.css'

type NavItem = { path: string; title: string; icon: LucideIcon }
const main: NavItem[] = [
  { path: '/', title: 'Tổng quan', icon: LayoutDashboard },
  { path: '/phien-hoc', title: 'Phiên học nhanh', icon: Timer },
  { path: '/lo-trinh', title: 'Lộ trình', icon: Route },
  { path: '/cau-hoi', title: 'Câu hỏi', icon: BookOpen },
  { path: '/coding', title: 'Coding', icon: Braces },
  { path: '/sql', title: 'SQL', icon: Database },
  { path: '/phong-van', title: 'Phỏng vấn thử', icon: Mic },
]
const personal: NavItem[] = [
  { path: '/on-tap', title: 'Ôn tập', icon: RotateCcw },
  { path: '/ghi-chu', title: 'Ghi chú', icon: NotebookPen },
  { path: '/tien-do', title: 'Tiến độ', icon: Activity },
  { path: '/cai-dat', title: 'Cài đặt', icon: Settings2 },
]
const admin: NavItem = { path: '/quan-tri', title: 'Quản trị nội dung', icon: ShieldCheck }

function selected(path: string, item: NavItem) {
  return path === item.path || (item.path !== '/' && path.startsWith(item.path + '/')) || (item.path === '/cau-hoi' && path.startsWith('/luot-luyen/'))
}
function Brand() {
  return <Link className="brand" href="/">
    <span className="brand-icon" aria-hidden="true"><Code2 size={22} strokeWidth={2.15} /></span>
    <span><strong>Interview Practice</strong><small>Luyện phỏng vấn .NET</small></span>
  </Link>
}
function Nav({ path, close }: { path: string; close?: () => void }) {
  const { user } = useSession()
  function group(items: NavItem[]) {
    return items.map(item => <Link key={item.path} href={item.path} className="nav-link" aria-current={selected(path, item) ? 'page' : undefined} onClick={close}>
      <item.icon size={19} strokeWidth={1.85} aria-hidden="true" /><span>{item.title}</span>
    </Link>)
  }
  return <nav className="nav-groups" aria-label="Điều hướng chính">
    <div className="nav-group"><span className="nav-label">Luyện tập</span>{group(main)}</div>
    <div className="nav-group"><span className="nav-label">Cá nhân</span>{group(personal)}</div>
    {user?.admin && <div className="nav-group">{group([admin])}</div>}
  </nav>
}

function View({ path, params }: { path: string; params: URLSearchParams }) {
  const [page, slug, extra] = path.slice(1).split('/')
  if (extra) return <NotFound />
  switch (page) {
    case '': return <DashboardPage />
    case 'lo-trinh': return <Roadmap />
    case 'chuan-bi': return <Preparation />
    case 'phien-hoc': return slug ? <StudyRoute key={slug} id={slug} params={params} /> : <StudyStart initial={params.get('mode') ?? 'new'} />
    case 'cau-hoi': return slug ? <PracticeRoute slug={slug} /> : <Bank params={params} />
    case 'luot-luyen': return slug ? <AttemptRoute id={slug} /> : <NotFound />
    case 'coding':
    case 'sql': return slug ? <ExerciseRoute kind={page} slug={slug} params={params} /> : <ExerciseList kind={page} params={params} />
    case 'phong-van': return slug ? <InterviewRoute id={slug} /> : <InterviewSetup key={params.toString()} params={params} />
    case 'on-tap': return <Reviews params={params} />
    case 'ghi-chu': return <Notes key={params.toString()} params={params} />
    case 'tien-do': return <Progress params={params} />
    case 'cai-dat': return <Settings />
    case 'quan-tri': return <AdminRoute slug={slug} />
    default: return <NotFound />
  }
}
function NotFound() {
  return <div className="panel"><Empty title="Không tìm thấy trang" detail="Đường dẫn có thể đã đổi." action={<ActionLink href="/">Về tổng quan</ActionLink>} /></div>
}

function App() {
  const { path, params } = useLocation()
  const { user, ready, issue, retry } = useSession()
  const [drawer, setDrawer] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches))
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const theme = () => { if (!document.documentElement.dataset.theme) setDark(media.matches) }
    const network = () => setOffline(!navigator.onLine)
    media.addEventListener('change', theme); window.addEventListener('online', network); window.addEventListener('offline', network)
    return () => { media.removeEventListener('change', theme); window.removeEventListener('online', network); window.removeEventListener('offline', network) }
  }, [])
  const mainArea = useRef<HTMLElement>(null)
  const lastPath = useRef(path)
  const nav = [...main, ...personal, ...(user?.admin ? [admin] : [])].find(x => selected(path, x))
  useEffect(() => {
    if (path !== lastPath.current) {
      setDrawer(false)
      if (mainArea.current) mainArea.current.focus({ preventScroll: true })
      lastPath.current = path
    }
    document.title = (nav?.title ? nav.title + ' · ' : '') + '04. .NET Interview Practice'
  }, [path, nav?.title])
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      const target = e.target
      if (e.isComposing || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'k' || drawer ||
        (target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select')))) return
      e.preventDefault()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [drawer])
  if (path === '/dang-nhap') return <SignIn params={params} />
  return <div className="shell">
    <a href="#main-area" className="skip-link">Tới nội dung chính</a>
    <aside className="sidebar">
      <Brand /><Nav path={path} />
      <div className="rail-foot"><Link href={user ? '/cai-dat' : signInLink()} className="rail-account">
        <span className="avatar">{user ? user.displayName.trim().charAt(0).toLocaleUpperCase('vi') : <UserRound size={18} />}</span>
        <span><strong>{user ? user.displayName : 'Tài khoản cá nhân'}</strong><small>{user ? 'Cài đặt tài khoản' : 'Đăng nhập để lưu tiến độ'}</small></span>
        <ChevronRight size={16} className="row-arrow" />
      </Link></div>
    </aside>
    <header className="topbar">
      <div className="topbar-left">
        <Button className="menu-button icon-button" tone="quiet" aria-label="Mở menu" onClick={() => setDrawer(true)}><Menu size={22} /></Button>
        <div className="breadcrumbs"><span>Không gian luyện tập</span><ChevronRight size={15} aria-hidden="true" /><strong>{nav?.title ?? 'Interview Practice'}</strong></div>
        <span className="mobile-title">{nav?.title ?? 'Interview Practice'}</span>
      </div>
      <div className="topbar-right">
        <Button className="icon-button" tone="quiet" aria-label={dark ? 'Dùng giao diện sáng' : 'Dùng giao diện tối'} onClick={() => {
          const next = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = next; setDark(!dark)
          try { localStorage.setItem('ip-theme', next) } catch { /* Preference applies to this tab. */ }
        }}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</Button>
        <Button className="quick-search" tone="quiet" aria-label="Tìm câu hỏi toàn bộ" onClick={() => setSearchOpen(true)}>
          <Search size={18} aria-hidden="true" /><span>Tìm câu hỏi</span><kbd>Ctrl K</kbd>
        </Button>
        {user ? <Link className="avatar" aria-label="Cài đặt tài khoản" href="/cai-dat">{user.displayName.trim().charAt(0).toLocaleUpperCase('vi')}</Link>
          : <ActionLink className="header-auth" href={signInLink()}>Đăng nhập</ActionLink>}
      </div>
    </header>
    <main className="main-area" tabIndex={-1} ref={mainArea} id="main-area">
      {offline && <p role="status" className="notice">Đang ngoại tuyến. Bản đang viết trên thiết bị sẽ đồng bộ khi có mạng.</p>}
      {!ready ? <Loading /> : <div key={user?.id ?? 'guest'}>
        <Problem text={issue} retry={retry} /><Suspense fallback={<Loading/>}><View path={path} params={params} /></Suspense>
      </div>}
    </main>
    <Dialog title="Điều hướng" open={drawer} onClose={() => setDrawer(false)} drawer><Nav path={path} close={() => setDrawer(false)} /></Dialog>
    <Dialog title="Tìm câu hỏi" open={searchOpen} onClose={() => setSearchOpen(false)}>
      <form className="stack" onSubmit={e => {
        e.preventDefault()
        setSearchOpen(false)
        navigate('/cau-hoi' + (term.trim() ? '?search=' + encodeURIComponent(term.trim()) : ''))
      }}>
        <Field label="Từ khóa"><input autoFocus value={term} maxLength={120} placeholder="Ví dụ Dependency Injection" onChange={e => setTerm(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault() }} /></Field>
        <Button type="submit" tone="primary">Tìm trong ngân hàng <ArrowRight size={16} /></Button>
      </form>
    </Dialog>
  </div>
}

createRoot(document.getElementById('root')!).render(<SessionProvider><App /></SessionProvider>)
