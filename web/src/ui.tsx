import { useEffect, useId, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, Clock3, ExternalLink, Inbox, X } from 'lucide-react'
import { label, labels, rubricTitles } from './types'
import type { Card, Reference } from './types'

export function navigate(href: string, { replace = false, preserveScroll = false } = {}) {
  if (href !== location.pathname + location.search) {
    if (replace) history.replaceState(null, '', href)
    else history.pushState(null, '', href)
    window.dispatchEvent(new Event('practice:navigate'))
  }
  if (!preserveScroll) window.scrollTo(0, 0)
}

export function useLocation() {
  const [path, setPath] = useState(location.pathname + location.search)
  useEffect(() => {
    const refresh = () => setPath(location.pathname + location.search)
    window.addEventListener('popstate', refresh)
    window.addEventListener('practice:navigate', refresh)
    return () => {
      window.removeEventListener('popstate', refresh)
      window.removeEventListener('practice:navigate', refresh)
    }
  }, [])
  return { path: path.split('?')[0], params: new URLSearchParams(path.split('?')[1]) }
}

export function Link({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props} onClick={event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
      props.target || !href.startsWith('/') || href.startsWith('//')) return
    event.preventDefault()
    navigate(href)
  }} />
}

type Tone = 'primary' | 'secondary' | 'quiet' | 'danger'
export function Button({ tone = 'secondary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return <button type={type} className={'button ' + tone + ' ' + className} {...props} />
}
export function ActionLink({ tone = 'secondary', className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { tone?: Tone }) {
  return <Link {...props} className={'button ' + tone + ' ' + className} />
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={'badge tone-' + tone}>{children}</span>
}
export function Difficulty({ value }: { value: string }) {
  return <Badge tone={{ easy: 'green', medium: 'amber', hard: 'red' }[value]}>{label('difficulty', value)}</Badge>
}

export function PageTitle({ title, description, action, back }: { title: string; description?: string; action?: ReactNode; back?: [string, string] }) {
  return <div className="page-heading">
    <div>
      {back && <Link href={back[0]} className="back-link"><ArrowLeft size={16} aria-hidden="true" />{back[1]}</Link>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action && <div className="page-action">{action}</div>}
  </div>
}
export function Empty({ title, detail, action, icon }: { title: string; detail: string; action?: ReactNode; icon?: ReactNode }) {
  return <div className="empty">
    <span className="empty-icon" aria-hidden="true">{icon ?? <Inbox size={22} />}</span>
    <div><h3>{title}</h3><p>{detail}</p></div>
    {action}
  </div>
}
export function Loading() {
  return <div className="loading" role="status"><span className="sr-only">Đang tải</span><div /><div /><div /></div>
}
export function Problem({ text, retry }: { text?: string; retry?: () => void }) {
  return text ? <div className="notice notice-error" role="alert">
    <AlertCircle size={18} aria-hidden="true" /><span>{text}</span>
    {retry && <Button tone="quiet" onClick={retry}>Thử lại</Button>}
  </div> : null
}
export function Field({ label: text, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return <label className={'field' + (full ? ' span-all' : '')}><span>{text}</span>{children}</label>
}
export function Options({ values }: { values: Record<string, string> }) {
  return <>{Object.entries(values).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</>
}
export function TopicChecks({ value, change, legend = 'Chủ đề' }: { value: string[]; change: (next: string[]) => void; legend?: string }) {
  return <fieldset className="choices"><legend>{legend}</legend><div className="chip-choices">
    {Object.entries(labels.topics).map(([key, name]) => <label key={key} className="check-chip">
      <input type="checkbox" checked={value.includes(key)} onChange={e => change(e.target.checked ? [...value, key] : value.filter(x => x !== key))} />
      {name}
    </label>)}
  </div></fieldset>
}
export function Dialog({ title, open, onClose, children, drawer = false }: {
  title: string; open: boolean; onClose: () => void; children: ReactNode; drawer?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const current = dialog.current
    if (!current) return
    if (open && !current.open) current.showModal()
    if (!open && current.open) current.close()
  }, [open])
  return <dialog ref={dialog} aria-labelledby={id} className={drawer ? 'drawer' : ''} onClose={onClose}>
    <div className="dialog-head"><h2 id={id}>{title}</h2><Button className="icon-button" tone="quiet" aria-label="Đóng" onClick={onClose}><X size={20} /></Button></div>
    {open && children}
  </dialog>
}
export function Segments({ values, selected, change, title }: { values: [string, string][]; selected: string; change: (x: string) => void; title: string }) {
  return <div className="segments" role="group" aria-label={title}>
    {values.map(([id, name]) => <button type="button" key={id} aria-pressed={selected === id} onClick={() => change(id)}>{name}</button>)}
  </div>
}
export function Pagination({ page, size, total, change }: { page: number; size: number; total: number; change: (page: number) => void }) {
  const pages = Math.ceil(total / size)
  return pages > 1 && <nav aria-label="Các trang kết quả" className="pagination">
    <Button onClick={() => change(page - 1)} disabled={page <= 1}><ArrowLeft size={16} /> Trước</Button>
    <span>Trang {page} / {pages}</span>
    <Button onClick={() => change(page + 1)} disabled={page >= pages}>Sau <ArrowRight size={16} /></Button>
  </nav>
}
export function QuestionCard({ item, children, href = '/cau-hoi/' + item.slug }: { item: Card; children?: ReactNode; href?: string }) {
  return <article className="question-card panel">
    <div className="split"><Badge tone={item.topic}>{label('topics', item.topic)}</Badge><Difficulty value={item.difficulty} /></div>
    <h3><Link href={href}>{item.title}</Link></h3>
    <div className="card-meta">
      <span>{label('format', item.format)}</span><span>{label('level', item.level)}</span>
      <span><Clock3 size={14} aria-hidden="true" />{item.minutes} phút</span>
    </div>
    {item.tags?.length ? <div className="tag-row">{item.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div> : null}
    <div className="question-foot">
      <span>{label('mastery', item.mastery ?? (item.outcome ? 'learning' : 'new'))}</span>
      {children ?? <Link className="text-link" href={href}>Mở câu hỏi <ArrowRight size={15} /></Link>}
    </div>
  </article>
}
export function CodeBlock({ children, language }: { children: string; language?: string }) {
  return <div className="code-block">{language && <div className="code-language">{language}</div>}<pre tabIndex={0} aria-label={language ? 'Đoạn mã ' + language : 'Nội dung đối chiếu'}><code>{children}</code></pre></div>
}
export function RubricPanel({ reference }: { reference: Reference }) {
  return <div className="reference">
    <div className="split"><h3>Đáp án tham khảo</h3><Badge>Phiên bản {reference.version}</Badge></div>
    <p>{reference.shortAnswer}</p>
    <h4>Ý chính mong đợi</h4>
    <ul>{reference.outline.map(point => <li key={point}>{point}</li>)}</ul>
    <h4>Giải thích</h4><p>{reference.explanation}</p>
    <h4>Phương án khác</h4><p>{reference.alternative}</p>
    <h4>Lỗi thường gặp</h4><p>{reference.trap}</p>
    <details className="details">
      <summary>Rubric 0–4 · phiên bản {reference.version}</summary>
      <dl className="rubric">
        {reference.rubric.map((criterion, index) => <div key={rubricTitles[index]}><dt>{rubricTitles[index]}</dt><dd>{criterion}</dd></div>)}
      </dl>
      <p className="small muted">0 = chưa thể hiện hoặc sai trọng tâm · 1 = rời rạc, còn lỗi · 2 = nắm một phần · 3 = đúng phần chính · 4 = có điều kiện, đánh đổi và ví dụ. Có thể chọn không áp dụng hoặc chưa đủ bằng chứng khi tự đối chiếu.</p>
    </details>
    <a className="text-link" href={reference.source} target="_blank" rel="noreferrer">Nguồn đối chiếu <ExternalLink size={14} /></a>
    <span className="small muted"> · kiểm tra {shortDate(reference.checkedOn)}</span>
  </div>
}
export function Ratings({ rating, change, busy }: { rating?: string; change: (value: string) => void; busy?: boolean }) {
  return <fieldset className="ratings">
    <legend>Tự đánh giá</legend>
    <p className="small muted">Bạn đang tự chọn mức hiểu của mình.</p>
    <div className="action-row">{Object.entries(labels.rating).map(([key, title]) =>
      <Button key={key} tone={rating === key ? 'primary' : 'secondary'} disabled={busy} aria-pressed={rating === key} onClick={() => change(key)}>{title}</Button>)}</div>
  </fieldset>
}
export const shortDate = (value: string) => new Intl.DateTimeFormat('vi', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(value.length === 10 ? value + 'T12:00:00Z' : value))
export const timeText = (seconds: number) => String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
export const dateTime = (value: string, timeZone: string) => new Intl.DateTimeFormat('vi', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(value))
