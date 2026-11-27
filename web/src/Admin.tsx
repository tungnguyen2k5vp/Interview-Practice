import { useState } from 'react'
import { MaterialEditor } from './MaterialEditor'
import { ChevronRight, Download, Plus, ShieldCheck } from 'lucide-react'
import { api, useAction, useResource } from './api'
import { useSession } from './session'
import type { Editorial, EditorialRow, QuestionContent } from './types'
import { label, labels, rubricTitles } from './types'
import { ActionLink, Badge, Button, Dialog, Empty, Field, Link, Loading, Options, PageTitle, Problem, navigate } from './ui'

export function AdminRoute({ slug }: { slug?: string }) {
  const { user } = useSession()
  const list = useResource<EditorialRow[]>(user?.admin && !slug ? '/admin/questions' : null)
  const detail = useResource<Editorial>(user?.admin && slug && slug !== 'new' && slug !== 'hoc-lieu' ? '/admin/questions/' + encodeURIComponent(slug) : null)
  const [search, setSearch] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const importer = useAction()
  if (!user?.admin) return <div className="page">
    <PageTitle title="Quản trị nội dung" /><div className="panel"><Empty title="Cần quyền biên tập nội dung" detail="Đăng nhập bằng tài khoản được cấp quyền quản trị nội dung." /></div>
  </div>
  if (slug === 'hoc-lieu') return <MaterialEditor />
  if (slug === 'new') return <EditorialEdit key="new" />
  if (detail.data) return <EditorialEdit key={detail.data.slug} initial={detail.data} />
  return <div className="page narrow">
    <PageTitle title="Quản trị câu hỏi" description="Lưu đề, đáp án và rubric thành phiên bản mới trước khi xuất bản."
      action={<div className="action-row"><ActionLink href="/quan-tri/hoc-lieu">Biên tập học liệu</ActionLink><ActionLink tone="primary" href="/quan-tri/new"><Plus size={16} /> Tạo câu hỏi</ActionLink></div>} />
    {(list.loading || detail.loading) && <Loading />}
    <Problem text={list.error || detail.error} retry={list.error ? list.reload : detail.reload} />
    {list.data && <section className="panel content-panel stack">
      <details className="details"><summary>Nhập câu hỏi từ JSON</summary><p className="small muted">Tối đa 20 câu, 200 KB. Các câu hợp lệ được lưu thành bản nháp.</p>
        <Field label="Tệp ngân hàng JSON"><input type="file" accept=".json,application/json" disabled={importer.busy} onChange={e=>{
          const file=e.target.files?.[0]; e.target.value=''; if(!file)return
          void importer.run(async()=>{
            setImportStatus('')
            if (!file.name.toLowerCase().endsWith('.json') || file.size > 204800) { setImportStatus('Chọn tệp JSON tối đa 200 KB.'); return }
            let items: unknown; try { items=JSON.parse(await file.text()) } catch { setImportStatus('Tệp JSON không hợp lệ.'); return }
            const result=await api<{imported:number}>('/admin/questions/import',{method:'POST',body:items})
            setImportStatus('Đã nhập '+result.imported+' câu nháp.'); list.reload()
          })
        }}/></Field><span role="status">{importStatus}</span><Problem text={importer.error}/></details>
      <Field label="Tìm trong nội dung"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tiêu đề hoặc slug…" /></Field>
      <div>{list.data.filter(x => (x.title + ' ' + x.slug).toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))).map(x =>
        <Link className="study-row" key={x.slug} href={'/quan-tri/' + x.slug}>
          <span className="topic-icon tone-indigo"><ShieldCheck size={18} /></span><span><strong>{x.title}</strong><small>{x.slug} · Bản v{x.latest}{x.published ? ' · Hiển thị v' + x.published : ''}</small></span>
          <Badge tone={x.status === 'published' ? 'green' : 'neutral'}>{label('publication', x.status)}</Badge><ChevronRight size={16} className="row-arrow" />
        </Link>)}</div>
    </section>}
  </div>
}

const empty: QuestionContent = {
  title: '', topic: 'csharp', subtopic: '', tags: [], format: 'concept', difficulty: 'easy', level: 'junior', minutes: 5,
  prompt: '', englishPrompt: '', context: '', hint: '', followUp: '', englishFollowUp: '', outline: [], shortAnswer: '',
  explanation: '', alternative: '', trap: '', rubric: ['', '', '', ''], source: '', checkedOn: '',
}
const prompts: [keyof QuestionContent, string, boolean][] = [
  ['prompt', 'Đề bài tiếng Việt', true], ['englishPrompt', 'Đề bài tiếng Anh', true], ['context', 'Bối cảnh tiếng Việt', false], ['code', 'Đoạn mã minh họa', false],
  ['hint', 'Gợi ý', true], ['nextHint', 'Gợi ý bước hai', false], ['followUp', 'Câu đào sâu tiếng Việt', true], ['englishFollowUp', 'Câu đào sâu tiếng Anh', true],
]
const answers: [keyof QuestionContent, string, boolean][] = [
  ['shortAnswer', 'Bản trả lời ngắn', true], ['explanation', 'Giải thích', true], ['alternative', 'Phương án khác', true], ['trap', 'Lỗi thường gặp', true],
]

function EditorialEdit({ initial }: { initial?: Editorial }) {
  const [editorial, setEditorial] = useState<Editorial | undefined>(initial)
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [content, setContent] = useState(initial?.content ?? empty)
  const [tags, setTags] = useState(initial?.content.tags.join(', ') ?? '')
  const [outline, setOutline] = useState(initial?.content.outline.join('\n') ?? '')
  const [status, setStatus] = useState('')
  const [dirty, setDirty] = useState(false)
  const [retire, setRetire] = useState(false)
  const action = useAction()
  const quiz = content.quiz
  function update<K extends keyof QuestionContent>(key: K, value: QuestionContent[K]) {
    setContent(old => ({ ...old, [key]: value }))
    setDirty(true)
    setStatus('')
  }
  function publish(next: 'published' | 'retired') {
    if (!editorial) return
    void action.run(async () => {
      const result = await api<Editorial>('/admin/questions/' + slug + '/publication', {
        method: 'POST', body: { revision: editorial.revision, status: next },
      })
      setEditorial(result)
      setRetire(false)
      setStatus(next === 'published' ? 'Đã xuất bản v' + result.latest + '.' : 'Đã ngừng xuất bản.')
    })
  }
  function areas(fields: typeof prompts) {
    return fields.map(([key, text, required]) => <Field key={key} label={text} full>
      <textarea rows={3} required={required} value={String(content[key] ?? '')} onChange={e => update(key, e.target.value)} />
    </Field>)
  }
  return <div className="page narrow">
    <PageTitle title={editorial ? 'Biên tập câu hỏi' : 'Tạo câu hỏi'} back={['/quan-tri', 'Quản trị câu hỏi']}
      description={editorial ? 'Bản v' + editorial.latest + ' · ' + label('publication', editorial.status) + (editorial.published ? ' · Người học thấy v' + editorial.published : '') : 'Bản mới sẽ được lưu ở trạng thái nháp.'} />
    <form className="stack" onSubmit={e => {
      e.preventDefault()
      void action.run(async () => {
        const clean = (values: string[]) => values.map(x => x.trim()).filter(Boolean)
        const value = { ...content, tags: clean(tags.split(',')), outline: clean(outline.split('\n')),
          related: clean(content.related ?? []), prerequisites: clean(content.prerequisites ?? []),
          quiz: quiz ? { ...quiz, vi: quiz.vi.map(x => x.trim()), en: quiz.en.map(x => x.trim()) } : null }
        const result = await api<Omit<Editorial, 'content'>>('/admin/questions/' + encodeURIComponent(slug), {
          method: 'PUT', body: { revision: editorial?.revision ?? 0, content: value },
        })
        setEditorial({ ...result, content: value })
        setContent(value)
        setDirty(false)
        setStatus('Đã lưu nháp v' + result.latest + '.')
        if (!editorial) navigate('/quan-tri/' + result.slug, { replace: true, preserveScroll: true })
      })
    }}>
      <section className="panel content-panel stack">
        <h2>Phân loại</h2>
        <div className="form-grid">
          <Field label="Slug"><input required maxLength={90} value={slug} readOnly={Boolean(editorial)} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e => setSlug(e.target.value)} /></Field>
          <Field label="Chủ đề"><select value={content.topic} onChange={e => update('topic', e.target.value)}><Options values={labels.topics} /></select></Field>
          <Field label="Tiêu đề" full><input required maxLength={160} value={content.title} onChange={e => update('title', e.target.value)} /></Field>
          <Field label="Chủ đề con"><input required maxLength={120} value={content.subtopic} onChange={e => update('subtopic', e.target.value)} /></Field>
          <Field label="Thẻ, phân cách bằng dấu phẩy"><input required value={tags} onChange={e => { setTags(e.target.value); setDirty(true) }} /></Field>
          <Field label="Dạng câu"><select value={content.format} onChange={e => update('format', e.target.value)}><Options values={labels.format} /></select></Field>
          <Field label="Độ khó"><select value={content.difficulty} onChange={e => update('difficulty', e.target.value)}><Options values={labels.difficulty} /></select></Field>
          <Field label="Mức mục tiêu"><select value={content.level} onChange={e => update('level', e.target.value)}><Options values={labels.level} /></select></Field>
          <Field label="Phút luyện gợi ý"><input type="number" min={1} max={60} required value={content.minutes} onChange={e => update('minutes', Number(e.target.value))} /></Field>
          <Field label="Phiên bản kỹ thuật" full><input maxLength={60} value={content.technology ?? ''} onChange={e => update('technology', e.target.value || null)} /></Field>
          <Field label="Slug câu tiên quyết, cách nhau bằng dấu phẩy"><input value={content.prerequisites?.join(',') ?? ''} onChange={e => update('prerequisites', e.target.value.split(','))}/></Field>
          <Field label="Slug câu liên quan, cách nhau bằng dấu phẩy"><input value={content.related?.join(',') ?? ''} onChange={e => update('related', e.target.value.split(','))}/></Field>
        </div>
        <label className="check-chip"><input type="checkbox" checked={!!content.core} onChange={e => update('core', e.target.checked)}/> Câu trọng tâm</label>
      </section>
      <section className="panel content-panel stack"><h2>Đề và câu đào sâu</h2>{areas(prompts)}</section>
      <section className="panel content-panel stack"><h2>Đáp án và rubric</h2>
        <label className="check-chip"><input type="checkbox" checked={!!quiz}
          onChange={e => update('quiz', e.target.checked ? { vi: ['', ''], en: ['', ''], correctIndex: 0 } : null)}/> Chấm theo lựa chọn trắc nghiệm</label>
        {quiz && <div className="form-grid">
          {(['vi', 'en'] as const).map(lang => <Field key={lang} label={'Lựa chọn tiếng ' + (lang === 'vi' ? 'Việt' : 'Anh') + ', mỗi dòng một đáp án'}>
            <textarea required rows={4} value={quiz[lang].join('\n')} onChange={e => update('quiz', { ...quiz, [lang]: e.target.value.split('\n') })}/>
          </Field>)}
          <label className="check-chip"><input type="checkbox" checked={!!quiz.correctIndices} onChange={e=>update('quiz',{...quiz,correctIndices:e.target.checked?[quiz.correctIndex]:undefined})}/> Chọn nhiều đáp án</label>
          {quiz.correctIndices ? <fieldset><legend>Các đáp án đúng</legend>{quiz.vi.map((o,i)=><label className="check-chip" key={i}><input type="checkbox" checked={quiz.correctIndices!.includes(i)} onChange={e=>{
            const indices=e.target.checked?[...quiz.correctIndices!,i]:quiz.correctIndices!.filter(n=>n!==i)
            update('quiz',{...quiz,correctIndices:indices,correctIndex:indices[0]??0})
          }}/>{o}</label>)}</fieldset> : <Field label="Đáp án đúng"><select required value={quiz.correctIndex < quiz.vi.length ? quiz.correctIndex : ''} onChange={e => update('quiz', { ...quiz, correctIndex: Number(e.target.value) })}>
            <option value="" disabled>Chọn đáp án</option>{quiz.vi.map((option, i) => <option key={i} value={i}>{i + 1}. {option}</option>)}</select></Field>}
          <Field label="Giải thích từng lựa chọn, mỗi dòng một ý" full><textarea value={quiz.reasons?.join('\n')??''} onChange={e=>update('quiz',{...quiz,reasons:e.target.value?e.target.value.split('\n'):undefined})}/></Field>
        </div>}
        <Field label="Ý chính mong đợi, mỗi ý một dòng"><textarea required rows={4} value={outline} onChange={e => { setOutline(e.target.value); setDirty(true) }} /></Field>
        {areas(answers)}
        {rubricTitles.map((title, index) => <Field key={title} label={title}><textarea required rows={2} maxLength={350} value={content.rubric[index]}
          onChange={e => update('rubric', content.rubric.map((x, i) => i === index ? e.target.value : x))} /></Field>)}
        <div className="form-grid"><Field label="Nguồn đối chiếu"><input type="url" required value={content.source} onChange={e => update('source', e.target.value)} /></Field>
          <Field label="Ngày kiểm tra"><input type="date" required value={content.checkedOn} onChange={e => update('checkedOn', e.target.value)} /></Field></div>
      </section>
      <div className="panel content-panel stack">
        <details className="details"><summary>Xem trước đề và đáp án</summary><h3>{content.title}</h3>
          <p>{content.prompt}</p><p lang="en">{content.englishPrompt}</p><p>{content.shortAnswer}</p>
          <ul>{content.rubric.map((line,i)=><li key={i}>{line}</li>)}</ul></details>
        {editorial && <a className="text-link" download href={'/api/admin/questions/'+encodeURIComponent(slug)+'/export'}><Download size={16}/> Xuất bản đã lưu ra JSON</a>}
        <div className="action-row"><Button type="submit" tone="primary" disabled={action.busy}>Lưu bản nháp</Button>
          {editorial && <Button disabled={dirty || action.busy || editorial.status === 'published'} onClick={() => publish('published')}>Xuất bản v{editorial.latest}</Button>}
          {editorial?.published && <Button tone="quiet" disabled={action.busy} onClick={() => setRetire(true)}>Ngừng xuất bản</Button>}
        </div><Problem text={action.error} />{status && <span role="status" className="success">{status}</span>}
      </div>
    </form>
    <Dialog title="Ngừng xuất bản câu hỏi?" open={retire} onClose={() => setRetire(false)}>
      <p>Câu sẽ rời ngân hàng. Các lượt luyện đã chốt tiếp tục hiển thị phiên bản đã dùng.</p>
      <div className="action-row"><Button onClick={() => setRetire(false)}>Giữ xuất bản</Button><Button tone="danger" disabled={action.busy} onClick={() => publish('retired')}>Ngừng xuất bản</Button></div>
      <Problem text={action.error} />
    </Dialog>
  </div>
}
