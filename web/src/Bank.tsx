import { useEffect, useState } from 'react'
import { Bookmark, Search, SlidersHorizontal } from 'lucide-react'
import { useResource } from './api'
import { useSession } from './session'
import type { Card, Page } from './types'
import { labels } from './types'
import { Button, Empty, Field, Loading, Options, PageTitle, Pagination, Problem, QuestionCard, navigate } from './ui'

const selects: { id: string; title: string; values: Record<string, string> }[] = [
  { id: 'topic', title: 'Chủ đề', values: labels.topics },
  { id: 'difficulty', title: 'Độ khó', values: labels.difficulty },
  { id: 'level', title: 'Mức mục tiêu', values: labels.level },
  { id: 'format', title: 'Dạng câu', values: labels.format },
  { id: 'technology', title: 'Phiên bản kỹ thuật', values: {} },
  { id: 'status', title: 'Tình trạng', values: { ...labels.mastery, answered: 'Đã trả lời', skipped: 'Đã bỏ qua' } },
]
export function Bank({ params }: { params: URLSearchParams }) {
  const { user } = useSession()
  const qs = params.toString()
  const oldSearch = params.get('search') ?? ''
  const [search, setSearch] = useState(oldSearch)
  const [expanded, setExpanded] = useState(Boolean(params.get('format') || params.get('technology') || params.get('status') || params.get('bookmarked') || params.get('due')))
  const resource = useResource<Page<Card>>('/questions?' + qs)
  const technologies = useResource<string[]>(expanded ? '/questions/technologies' : null)
  const activeTechnology = params.get('technology')
  const technologyOptions = Object.fromEntries([...(technologies.data ?? []), ...(activeTechnology ? [activeTechnology] : [])].map(x => [x, x]))
  useEffect(() => { setSearch(oldSearch) }, [oldSearch])
  function filter(key: string, value: string) {
    const next = new URLSearchParams(qs)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    navigate('/cau-hoi' + (next.size ? '?' + next.toString() : ''), { preserveScroll: key !== 'page' })
  }
  return <div className="page">
    <PageTitle title="Ngân hàng câu hỏi" description="Chọn một câu và trả lời bằng lời của bạn trước khi mở gợi ý." />
    <section className="panel filter-panel" aria-label="Bộ lọc câu hỏi">
      <form className="search-form" onSubmit={e => {
        e.preventDefault()
        filter('search', search.trim())
      }}>
        <label className="search-input"><Search size={19} aria-hidden="true" /><span className="sr-only">Tìm câu hỏi</span>
          <input placeholder="Tìm theo từ khóa, chủ đề hoặc thẻ…" value={search} onChange={e => setSearch(e.target.value)} maxLength={120}
            onKeyDown={e => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault() }} />
        </label>
        <Button type="submit" tone="primary">Tìm kiếm</Button>
        <Button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><SlidersHorizontal size={16} /> Bộ lọc</Button>
      </form>
      <div className="filter-grid">
        {selects.slice(0, expanded ? selects.length : 3).filter(x => x.id !== 'status' || user).map(filterItem =>
          <Field key={filterItem.id} label={filterItem.title}><select value={params.get(filterItem.id) ?? ''} onChange={e => filter(filterItem.id, e.target.value)}>
            <option value="">Tất cả</option><Options values={filterItem.id === 'technology' ? technologyOptions : filterItem.values} />
          </select></Field>)}
      </div>
      {expanded && <Problem text={technologies.error} retry={technologies.reload} />}
      {expanded && user && <div className="action-row filters-extra">
        <label className="check-chip"><input type="checkbox" checked={params.get('bookmarked') === 'true'} onChange={e => filter('bookmarked', e.target.checked ? 'true' : '')} /> Đã đánh dấu</label>
        <label className="check-chip"><input type="checkbox" checked={params.get('due') === 'true'} onChange={e => filter('due', e.target.checked ? 'true' : '')} /> Đến hạn ôn</label>
      </div>}
    </section>
    <div className="results-heading"><p role="status">{resource.data ? resource.data.total + ' câu hỏi' : resource.loading ? 'Đang tìm câu hỏi…' : 'Kết quả tìm kiếm'}</p>
      {params.size > 0 && <Button tone="quiet" onClick={() => { setSearch(''); navigate('/cau-hoi', { preserveScroll: true }) }}>Xóa bộ lọc</Button>}
    </div>
    {resource.loading ? <Loading /> : resource.error ? <Problem text={resource.error} retry={resource.reload} />
      : resource.data?.items.length ? <>
        <div className="card-grid">{resource.data.items.map(item => <QuestionCard key={item.slug} item={item} href={'/cau-hoi/'+item.slug+'?bank='+encodeURIComponent(qs)}
          children={item.bookmarked ? <span className="saved-label"><Bookmark size={15} fill="currentColor" /> Đã đánh dấu</span> : undefined} />)}</div>
        <Pagination page={resource.data.page} size={resource.data.pageSize} total={resource.data.total} change={p => filter('page', String(p))} />
      </> : <div className="panel"><Empty title="Không tìm thấy câu hỏi" detail="Thử từ khóa ngắn hơn hoặc bỏ bớt một bộ lọc."
        action={<Button onClick={() => { setSearch(''); navigate('/cau-hoi') }}>Xóa bộ lọc</Button>} /></div>}
  </div>
}
