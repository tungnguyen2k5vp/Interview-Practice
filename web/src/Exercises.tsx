import { lazy, Suspense, useState } from 'react'
import { ArrowRight, Braces, CircleCheck, Clock3, Database, ExternalLink, Lightbulb, RotateCcw } from 'lucide-react'
import { useRuns } from './RunResults'
import { label } from './types'
import { api, useAction, useResource } from './api'
import { useDraft } from './draft'
import { DraftConflict, ownerKey } from './Practice'
import { signInLink, useSession } from './session'
import type { Example, Exercise, ExerciseCard, ExerciseDraft, ExerciseKind, ExternalPractice } from './types'
import { ActionLink, Badge, Button, CodeBlock, Dialog, Difficulty, Field, Link, Loading, PageTitle, Problem, Segments, navigate, shortDate } from './ui'

const CodeEditor = lazy(() => import('./CodeEditor'))
const exerciseName = { coding: 'Coding Practice', sql: 'SQL Practice' }

export function ExerciseList({ kind, params }: { kind: ExerciseKind; params: URLSearchParams }) {
  const external = kind === 'coding' && params.get('tab') === 'leetcode'
  const { user } = useSession()
  const list = useResource<ExerciseCard[]>(external ? null : '/exercises?kind=' + kind)
  const links = useResource<ExternalPractice[]>(external ? '/external-practice' : null)
  return <div className="page">
    <PageTitle title={exerciseName[kind]} description={kind === 'coding' ? 'Luyện C# với đề tự biên soạn, test công khai và lời giải đối chiếu.'
      : 'Luyện T-SQL với schema, dữ liệu mẫu và kết quả đối chiếu theo từng phiên bản.'} />
    {kind === 'coding' && <Segments title="Nguồn bài tập" values={[[ 'local', 'Bài luyện C#' ], [ 'external', 'LeetCode' ]]}
      selected={external ? 'external' : 'local'} change={x => navigate(x === 'external' ? '/coding?tab=leetcode' : '/coding')} />}
    {(list.loading || links.loading) && <Loading />}
    <Problem text={list.error} retry={list.reload} /><Problem text={links.error} retry={links.reload} />
    {list.data && <div className="card-grid">{list.data.map(item => <article className="panel question-card" key={item.slug}>
      <div className="split"><span className={'topic-icon ' + (kind === 'sql' ? 'tone-sql' : 'tone-csharp')}>{kind === 'sql' ? <Database size={19} /> : <Braces size={19} />}</span>
        <Difficulty value={item.difficulty} /></div>
      <h2><Link href={'/' + kind + '/' + item.slug}>{item.title}</Link></h2>
      <div className="tag-row">{item.tags.map(t => <span key={t}>{t}</span>)}</div>
      <div className="card-meta"><span><Clock3 size={14} />{item.minutes} phút</span><span>{item.runtime}</span></div>
      <div className="question-foot"><span>{label('exerciseProgress', item.progress)}</span>
        <Link className="text-link" href={'/' + kind + '/' + item.slug}>Mở bài <ArrowRight size={15} /></Link></div>
    </article>)}</div>}
    {links.data && <div className="panel content-panel stack">
      <h2>Bài luyện trên LeetCode</h2><p className="muted">Trạng thái và ghi chú do bạn tự ghi nhận tại đây.</p>
      {links.data.map(x => <ExternalRow item={x} key={x.link.slug} allowEdit={Boolean(user)} />)}
    </div>}
  </div>
}

function ExternalRow({ item, allowEdit }: { item: ExternalPractice; allowEdit: boolean }) {
  const [status, setStatus] = useState(item.record?.status ?? 'new')
  const [note, setNote] = useState(item.record?.note ?? '')
  const [saved, setSaved] = useState(false)
  const action = useAction()
  return <details className="details external-row">
    <summary><span>{item.link.number}. {item.link.name}</span><Difficulty value={item.link.difficulty} /></summary>
    <div className="stack">
      <div className="tag-row">{item.link.tags.map(x => <span key={x}>{x}</span>)}</div>
      <div><a href={item.link.url} className="text-link" target="_blank" rel="noreferrer">Mở trên LeetCode <ExternalLink size={15} /></a>
        <span className="small muted"> · kiểm tra liên kết {shortDate(item.link.checkedOn)}</span></div>
      {allowEdit ? <form className="stack" onSubmit={e => {
        e.preventDefault()
        void action.run(async () => {
          await api('/external-practice/' + item.link.slug, { method: 'PUT', body: { status, note } })
          setSaved(true)
        })
      }}>
        <Field label="Tự ghi nhận trạng thái"><select value={status} onChange={e => { setStatus(e.target.value); setSaved(false) }}>
          <option value="new">Chưa luyện</option><option value="working">Đang luyện</option><option value="done">Đã luyện</option></select></Field>
        <Field label="Ghi chú riêng"><textarea rows={3} value={note} maxLength={4000} onChange={e => { setNote(e.target.value); setSaved(false) }} /></Field>
        <div className="action-row"><Button type="submit" disabled={action.busy}>Lưu ghi nhận</Button>{saved && <span role="status" className="success">Đã lưu</span>}</div>
        <Problem text={action.error} />
      </form> : <ActionLink href={signInLink()}>Đăng nhập để ghi nhận</ActionLink>}
    </div>
  </details>
}

export function ExerciseRoute({ kind, slug, params }: { kind: ExerciseKind; slug: string; params: URLSearchParams }) {
  const version = params.get('version')
  const { user } = useSession()
  const resource = useResource<Exercise>('/exercises/' + encodeURIComponent(slug) + (version ? '?version=' + encodeURIComponent(version) : ''))
  if (resource.loading) return <Loading />
  if (!resource.data || resource.data.card.kind !== kind) return <Problem text={resource.error || 'Không tìm thấy bài tập trong khu vực này.'} retry={resource.reload} />
  return <ExerciseWork key={slug + ':' + resource.data.card.version+':'+params.get('placement')} initial={resource.data} userId={user?.id} placement={params.get('placement')??undefined} />
}

function ExerciseWork({ initial, userId, placement }: { initial: Exercise; userId?: string; placement?:string }) {
  const [data, setData] = useState(initial)
  const [view, setView] = useState('problem')
  const [reset, setReset] = useState(false)
  const action = useAction()
  const { card } = data
  const { kind, slug, version } = card
  const base = '/exercises/' + slug
  const draft = useDraft(ownerKey(userId ?? '', 'exercise', slug + ':' + version), { stamp: initial.draft?.revision ?? 0, text: initial.draft?.text ?? initial.starter },
    async snapshot => {
      const result = await api<ExerciseDraft>(base + '/' + version + '/draft', { method: 'PUT', body: { revision: snapshot.stamp, text: snapshot.text } })
      setData(x => ({ ...x, draft: result, savedVersions: [...new Set([...x.savedVersions, version])] }))
      return { stamp: result.revision, text: result.text }
    }, Object.is, Boolean(userId))
  function mark(which: 'hint' | 'solution' | 'reviewed') {
    if (!userId) { navigate(signInLink()); return }
    void action.run(async () => {
      await draft.flush()
      const result = await api<Exercise>(base + '/' + version + '/marks/' + which, { method: 'POST' })
      draft.accept({ stamp: result.draft?.revision ?? 0, text: result.draft?.text ?? result.starter })
      setData(result)
      if (which === 'solution') setView('result')
    })
  }
  function resolve(keep: boolean) {
    void action.run(async () => {
      const result = await api<Exercise>(base + '?version=' + version)
      draft.accept({ stamp: result.draft?.revision ?? 0, text: result.draft?.text ?? result.starter }, keep)
      setData(result)
    })
  }
  const save = () => { void action.run(() => draft.flush(true)) }
  const runs = useRuns(slug, version, Boolean(userId), data.runnerAvailable, draft.text,placement)
  const [width, setWidth] = useState(42)
  return <div className="page exercise-page">
    <PageTitle title={card.title} back={placement ? ['/phien-hoc/'+encodeURIComponent(placement),'Kiểm tra đầu vào'] : data.reproduce ? ['/thuc-hanh?mode=debug', 'Debugging Lab'] : ['/' + kind, exerciseName[kind]]} />
    <div className="metadata"><Difficulty value={card.difficulty} /><span>{card.runtime}</span><span>{card.minutes} phút</span>
      <span>Bài v{version} · {kind === 'sql' ? 'Dữ liệu' : 'Test'} v{data.testVersion}</span>
      <label className="split-control">Độ rộng đề bài <input type="range" min={30} max={60} value={width} onChange={e => setWidth(Number(e.target.value))}/></label></div>
    <div className="mobile-exercise-tabs">
      <Segments title="Không gian làm bài" selected={view} change={setView} values={[[ 'problem', 'Đề bài' ], [ 'editor', 'Code' ], [ 'result', 'Kết quả' ]]} />
    </div>
    <div className="exercise-layout" data-view={view} style={{'--problem-size': width + '%'} as React.CSSProperties}>
      <section className="panel content-panel stack exercise-problem">
        <h2>Đề bài</h2><p>{data.description}</p>
        {data.reproduce && <div className="brief-block"><h3>Tái hiện lỗi</h3><p>{data.reproduce}</p></div>}
        <div className="brief-block"><h3>Đầu vào</h3><p>{data.input}</p><h3>Đầu ra</h3><p>{data.output}</p></div>
        <div><h3>Ràng buộc</h3><ul>{data.constraints.map(x => <li key={x}>{x}</li>)}</ul></div>
        {data.schema && <details className="details" open><summary>Schema</summary><CodeBlock language="T-SQL">{data.schema}</CodeBlock></details>}
        {data.dataset && <details className="details"><summary>Dữ liệu mẫu</summary>{data.tables?.map(t=><div className="result-table" key={t.name} tabIndex={0}>
          <table><caption>{t.name}</caption><thead><tr>{t.columns.map(c=><th key={c.name} scope="col">{c.name}<br/><small>{c.type}</small></th>)}</tr></thead>
          <tbody>{t.rows.map((r,i)=><tr key={i}>{r.map((v,k)=><td key={k}>{v ?? 'NULL'}</td>)}</tr>)}</tbody></table></div>)}
          <details><summary>Lệnh tạo dữ liệu</summary><CodeBlock language="T-SQL">{data.dataset}</CodeBlock></details></details>}
        <div><h3>Ví dụ</h3>{data.examples.map(x => <ExampleBlock key={x.input} item={x} />)}</div>
        <details className="details"><summary>{kind === 'coding' ? 'Test công khai' : 'Trường hợp kiểm tra'}</summary>
          {data.tests.map(x => <ExampleBlock key={x.input} item={x} />)}
        </details>
        <div className="action-row"><Button disabled={action.busy || Boolean(data.hint)} onClick={() => mark('hint')}><Lightbulb size={16} /> Xin gợi ý</Button>
          <Button tone="quiet" disabled={action.busy || Boolean(data.reference)} onClick={() => mark('solution')}>Xem lời giải</Button></div>
        {data.hint && <p className="notice hint">{data.hint}</p>}
      </section>
      <section className="panel editor-panel exercise-editor">
        <div className="editor-head"><div><h2>{kind === 'coding' ? 'Editor C#' : 'Editor SQL'}</h2>
          <span className="small muted" role="status">{userId ? draft.stateText : 'Đăng nhập để viết và lưu mã'}</span></div>
          {userId && <Button tone="quiet" className="icon-button" aria-label="Đặt lại mã khởi đầu" disabled={action.busy || draft.text === data.starter} onClick={() => setReset(true)}><RotateCcw size={18} /></Button>}</div>
        <Suspense fallback={<Loading />}><CodeEditor kind={kind} value={draft.text} change={draft.change} readOnly={!userId || action.busy} save={save} /></Suspense>
        <div className="editor-footer">
          <div className="action-row">
            {runs.buttons}
            {userId ? <Button tone="primary" disabled={action.busy || draft.state === 'conflict'} onClick={save}>Lưu nháp</Button>
              : <ActionLink tone="primary" href={signInLink()}>Đăng nhập</ActionLink>}
          </div>
          {!data.runnerAvailable && <p className="small muted">Chưa cấu hình môi trường thực thi.</p>}
          {data.savedVersions.length > 1 && <Field label="Phiên bản bản nháp"><select value={version} onChange={e => navigate('/' + kind + '/' + slug + '?version=' + e.target.value)}>
            {data.savedVersions.map(x => <option key={x} value={x}>Bài v{x}</option>)}</select></Field>}
          {draft.state === 'conflict' && <DraftConflict onKeep={() => resolve(true)} onServer={() => resolve(false)} busy={action.busy} />}
        </div>
      </section>
      <section className="panel content-panel stack exercise-result">
        <div className="split"><h2>Kết quả thực thi</h2>{!data.runnerAvailable && <Badge tone="amber">Chưa cấu hình runner</Badge>}</div>
        {runs.output}
        {!data.runnerAvailable && <p className="muted">Bạn có thể tự đối chiếu với ví dụ và lời giải.</p>}
        {data.expected && <><h3>Kết quả đối chiếu · Dữ liệu v{data.testVersion}</h3>
          <p className="small muted">{data.ordered ? 'Có quy tắc thứ tự ở đầu ra.' : 'Đề cho phép mọi thứ tự hàng.'}</p><CodeBlock>{data.expected}</CodeBlock></>}
        {data.reference ? <div className="stack">
          <h3>Lời giải tham khảo</h3><CodeBlock language={kind === 'sql' ? 'T-SQL' : 'C#'}>{data.reference.code}</CodeBlock>
          <p>{data.reference.explanation}</p><p className="muted">{data.reference.complexity}</p>
        </div> : <Button tone="quiet" onClick={() => mark('solution')} disabled={action.busy}>Xem lời giải tham khảo <ArrowRight size={16} /></Button>}
        {userId && (data.draft?.reviewed
          ? <span className="success" role="status"><CircleCheck size={17} /> Đã tự đối chiếu bản nháp</span>
          : <Button disabled={action.busy || draft.text === data.starter || !draft.text.trim()} onClick={() => mark('reviewed')}>Đánh dấu đã tự đối chiếu</Button>)}
      </section>
    </div>
    <Problem text={action.error || (draft.state === 'error' ? draft.issue : '')} />
    <Dialog title="Đặt lại mã khởi đầu?" open={reset} onClose={() => setReset(false)}>
      <p>Mã bạn đang viết sẽ được thay bằng đoạn mã khởi đầu của bài này.</p>
      <div className="action-row"><Button onClick={() => setReset(false)}>Giữ mã hiện tại</Button>
        <Button tone="danger" onClick={() => { draft.change(data.starter); setReset(false) }}>Đặt lại mã</Button></div>
    </Dialog>
  </div>
}

function ExampleBlock({ item }: { item: Example }) {
  return <div className="example-block"><dl><dt>Đầu vào</dt><dd>{item.input}</dd><dt>Đầu ra</dt><dd>{item.output}</dd></dl><p className="small muted">{item.explanation}</p></div>
}
