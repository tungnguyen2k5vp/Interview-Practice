import { createContext, useContext, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowRight, Code2, LockKeyhole } from 'lucide-react'
import { api, resetCsrf, useAction } from './api'
import { defaultGoal } from './types'
import type { Goal, User } from './types'
import { ActionLink, Button, Empty, Field, Link, Problem, navigate } from './ui'

type Session = {
  user: User | null; ready: boolean; goal: Goal; setGoal: (goal: Goal) => void
  setUser: (user: User | null) => void; issue?: string; retry: () => void
}
const SessionContext = createContext<Session | null>(null)
export function useSession() { return useContext(SessionContext)! }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, updateUser] = useState<User | null>(null)
  const [goal, setGoal] = useState<Goal>(defaultGoal)
  const [ready, setReady] = useState(false)
  const [issue, setIssue] = useState(false)
  const [revision, setRevision] = useState(0)
  function setUser(next: User | null) {
    resetCsrf()
    updateUser(next)
    setGoal(defaultGoal)
    setIssue(false)
    setReady(true)
  }
  useEffect(() => {
    const controller = new AbortController()
    api<{ user?: User }>('/auth/me', { signal: controller.signal }).then(x => {
      if (!controller.signal.aborted) setUser(x.user ?? null)
    }).catch(() => {
      if (!controller.signal.aborted) { setIssue(true); setReady(true) }
    })
    return () => controller.abort()
  }, [revision])
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    api<Goal>('/profile', { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setGoal(value)
    }).catch(() => {})
    return () => controller.abort()
  }, [user])
  useEffect(() => {
    const expire = () => {
      if (!user) return
      const path = location.pathname + location.search
      setUser(null)
      navigate('/dang-nhap?expired=1&next=' + encodeURIComponent(path))
    }
    window.addEventListener('practice:session-expired', expire)
    return () => window.removeEventListener('practice:session-expired', expire)
  }, [user])
  return <SessionContext.Provider value={{ user, ready, goal, setGoal, setUser,
    issue: issue ? 'Chưa kiểm tra được phiên đăng nhập. Kiểm tra kết nối rồi thử lại.' : undefined,
    retry: () => setRevision(x => x + 1) }}>{children}</SessionContext.Provider>
}

export function signInLink(next = location.pathname + location.search) {
  return '/dang-nhap?next=' + encodeURIComponent(next)
}
export function SignInGate({ detail }: { detail: string }) {
  return <div className="panel"><Empty icon={<LockKeyhole size={22} />} title="Lưu tiến độ của bạn" detail={detail}
    action={<ActionLink tone="primary" href={signInLink()}>Đăng nhập <ArrowRight size={16} /></ActionLink>} /></div>
}
export function SignIn({ params }: { params: URLSearchParams }) {
  const [isNew, setNew] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { setUser, user } = useSession()
  const action = useAction()
  const requested = params.get('next') ?? '/'
  const next = requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\') && !requested.startsWith('/dang-nhap') ? requested : '/'
  function submit(event: FormEvent) {
    event.preventDefault()
    void action.run(async () => {
      const result = await api<User>(isNew ? '/auth/register' : '/auth/login', {
        method: 'POST', body: { email, password, ...(isNew ? { displayName: name } : {}) },
      })
      setUser(result)
      navigate(next, { replace: true })
    })
  }
  return <div className="auth-page">
    <Link className="auth-brand" href="/"><span className="brand-icon"><Code2 size={21} /></span><span>.NET Interview Practice</span></Link>
    <section className="panel auth-card">
      <h1>{isNew ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
      <p className="muted">{user ? 'Bạn đã đăng nhập.' : 'Lưu câu trả lời, ghi chú và phiên phỏng vấn của riêng bạn.'}</p>
      {params.get('expired') && !user && <div className="notice">Phiên đăng nhập đã hết. Bản nháp chưa đồng bộ vẫn được giữ trên thiết bị này nếu trình duyệt cho phép.</div>}
      {user ? <ActionLink tone="primary" href={next}>Tiếp tục <ArrowRight size={16} /></ActionLink>
        : <form className="stack" onSubmit={submit}>
          {isNew && <Field label="Tên hiển thị"><input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" /></Field>}
          <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" /></Field>
          <Field label="Mật khẩu"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={isNew ? 12 : undefined} maxLength={128} autoComplete={isNew ? 'new-password' : 'current-password'} /></Field>
          {isNew && <p className="small muted">Dùng ít nhất 12 ký tự.</p>}
          <Problem text={action.error} />
          <Button type="submit" tone="primary" disabled={action.busy}>{action.busy ? 'Đang xử lý…' : isNew ? 'Tạo tài khoản' : 'Đăng nhập'} <ArrowRight size={16} /></Button>
          <button type="button" className="text-link auth-switch" onClick={() => { action.clearError(); setNew(!isNew) }}>{isNew ? 'Quay lại đăng nhập' : 'Tạo tài khoản mới'}</button>
        </form>}
    </section>
  </div>
}
