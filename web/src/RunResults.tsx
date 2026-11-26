import { useEffect, useRef, useState } from 'react'
import { Play, Send } from 'lucide-react'
import { api, message, useAction, useResource } from './api'
import { Badge, Button, CodeBlock, Field, Pagination, Problem } from './ui'
import { runStatuses as status } from './types'

type Job = { id: string; action: string; status: string; at: string; output?: string; columns?: string[]; rows?: (string | null)[][]
  passed?: number; total?: number; milliseconds?: number }

export function useRuns(slug: string, version: number, signedIn: boolean, available: boolean, code: string, placement?:string) {
  const enabled = signedIn && available
  const base = '/runner/' + slug + '/' + version + '/jobs'
  const [input, setInput] = useState('')
  const [job, setJob] = useState<Job>()
  const [issue, setIssue] = useState('')
  const [page, setPage] = useState(1)
  const [comparison, setComparison] = useState<Job[]>([])
  const history = useResource<{items: Job[]; total: number}>(signedIn ? base + '?page=' + page : null)
  const action = useAction()
  const key = useRef({ id: crypto.randomUUID(), payload: '' })
  const active = job?.status === 'running' || job?.status === 'queued'
  const refresh = history.reload
  const refreshRef = useRef(refresh); refreshRef.current = refresh
  const id = job?.id
  useEffect(() => {
    if (!enabled || !active || !id) return
    const controller = new AbortController()
    let timer: number
    const poll = async () => {
      try {
        const row = await api<Job>('/runner/jobs/' + id, { signal: controller.signal })
        if (controller.signal.aborted) return
        setJob(row); setIssue('')
        if (['queued','running'].includes(row.status)) timer = window.setTimeout(poll, 1200)
        else refreshRef.current()
      } catch (error) {
        if (!controller.signal.aborted) { setIssue(message(error)); timer = window.setTimeout(poll, 5000) }
      }
    }
    timer = window.setTimeout(poll, 1000)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [id, active, enabled])
  function launch(operation: 'run' | 'submit') {
    void action.run(async () => {
      const payload = JSON.stringify([operation, code, operation === 'run' ? input : null])
      if (key.current.payload !== payload) key.current = { id: crypto.randomUUID(), payload }
      const row = await api<Job>(base, {method:'POST',body:{id:key.current.id, action:operation, code, input:operation === 'run' ? input : null,
        placementId:operation==='submit'?placement:undefined}})
      key.current.payload = ''; setJob(row); setPage(1); history.reload()
    })
  }
  const buttons = <><Button disabled={!enabled || action.busy || active} onClick={() => launch('run')}><Play size={16}/> Run</Button>
    <Button disabled={!enabled || action.busy || active} onClick={() => launch('submit')}><Send size={15}/> Submit</Button></>
  const output = (enabled || Boolean(history.data?.total) || Boolean(history.error)) && <>
    {job && <div className="stack" role="status"><div className="metadata"><Badge tone={job.status === 'accepted' ? 'green' : 'neutral'}>{status[job.status]}</Badge>
      {job.total != null && <span>{job.passed} / {job.total} test đạt</span>}{job.milliseconds != null && <span>{(job.milliseconds / 1000).toLocaleString('vi', { maximumFractionDigits: 2 })} giây</span>}</div>
      {job.output && <CodeBlock>{job.output}</CodeBlock>}
      {job.columns && job.rows && <div className="result-table" tabIndex={0}><table><thead><tr>{job.columns.map((c,i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>{job.rows.map((r,i) => <tr key={i}>{r.map((value,k) => <td key={k}>{value ?? 'NULL'}</td>)}</tr>)}</tbody></table></div>}
      {enabled && active && <Button disabled={action.busy} onClick={() => void action.run(async () => { setJob(await api<Job>('/runner/jobs/' + job.id, {method:'DELETE'})); history.reload() })}>Hủy lượt chạy</Button>}
    </div>}
    {enabled && <Field label="Đầu vào tùy chỉnh"><textarea maxLength={8000} rows={3} value={input} onChange={e => setInput(e.target.value)}/></Field>}
    <h3>Lịch sử chạy và nộp</h3>
    {history.data?.items.map(row => <div className="split" key={row.id}>
      <Button onClick={() => setJob(row)}>{row.action} · {status[row.status]} · {new Date(row.at).toLocaleString('vi')}</Button>
      {row.action === 'submit' && !['queued','running'].includes(row.status) && <label className="check-chip"><input type="checkbox"
        aria-label={'So sánh lượt nộp ' + new Date(row.at).toLocaleString('vi')} checked={comparison.some(x => x.id === row.id)}
        disabled={comparison.length === 2 && !comparison.some(x => x.id === row.id)}
        onChange={e => setComparison(e.target.checked ? [...comparison, row] : comparison.filter(x => x.id !== row.id))}/> So sánh</label>}
    </div>)}
    {history.data?.total === 0 && <p className="muted">Chưa có lượt chạy.</p>}
    {history.data && <Pagination page={page} size={10} total={history.data.total} change={setPage}/>}
    {comparison.length === 1 && <p role="status" className="muted">Chọn thêm một lượt nộp để so sánh.</p>}
    {comparison.length === 2 && <div className="result-table" tabIndex={0}><table>
      <caption>So sánh hai lượt nộp</caption><thead><tr><th scope="col">Lượt nộp</th><th scope="col">Kết quả</th>
        <th scope="col">Test đạt</th><th scope="col">Thời gian</th></tr></thead>
      <tbody>{comparison.map(row => <tr key={row.id}><th scope="row">{new Date(row.at).toLocaleString('vi')}</th>
        <td>{status[row.status]}</td><td>{row.total != null && row.passed != null ? row.passed + ' / ' + row.total : '—'}</td>
        <td>{row.milliseconds != null ? row.milliseconds + ' ms' : '—'}</td></tr>)}</tbody></table></div>}
    <Problem text={action.error || issue || history.error}/>
  </>
  return { buttons, output }
}
