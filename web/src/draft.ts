import { useEffect, useRef, useState } from 'react'
import { ApiError, localGet, localSet, message } from './api'

type DraftState = 'empty' | 'pending' | 'saving' | 'saved' | 'offline' | 'conflict' | 'error'
type Snapshot<T> = { stamp: T; text: string }

const tab = (() => {
  try {
    const id = sessionStorage.getItem('interview-practice-tab') ?? crypto.randomUUID()
    sessionStorage.setItem('interview-practice-tab', id)
    return id
  } catch { return crypto.randomUUID() }
})()

export function useDraft<T>(key: string, initial: Snapshot<T>, write: (snapshot: Snapshot<T>) => Promise<Snapshot<T>>,
  sameStamp: (a: T, b: T) => boolean = Object.is, enabled = true) {
  const storageKey = key + ':' + tab
  const [pending] = useState(() => enabled ? localGet<Snapshot<T>>(storageKey) : null)
  const [text, setText] = useState(pending?.text ?? initial.text)
  const [state, setState] = useState<DraftState>(() => !pending ? 'empty' : pending.text === initial.text ? 'saved'
    : sameStamp(pending.stamp, initial.stamp) ? 'pending' : 'conflict')
  const [issue, setIssue] = useState('')
  const [local, setLocal] = useState(Boolean(pending))
  const server = useRef<Snapshot<T>>(initial)
  const current = useRef(text)
  const blocked = useRef(state === 'conflict')
  const inFlight = useRef<Promise<void> | null>(null)

  function store(next: string) {
    setLocal(localSet(storageKey, { stamp: server.current.stamp, text: next }))
  }

  function change(next: string) {
    current.current = next
    setText(next)
    setIssue('')
    if (next === server.current.text && !inFlight.current) {
      setLocal(false)
      localSet(storageKey, null)
      if (!blocked.current) setState('saved')
      return
    }
    store(next)
    if (!blocked.current) setState(navigator.onLine ? 'pending' : 'offline')
  }

  function flush(force = false): Promise<T> {
    return persist(force).then(() => server.current.stamp)
  }

  async function persist(force: boolean) {
    if (!enabled) return
    if (inFlight.current) await inFlight.current
    if (blocked.current) throw new ApiError(409, 'Hãy chọn bản nháp sẽ giữ trước khi lưu.')
    if (current.current === server.current.text && !force) return
    const outgoing = { stamp: server.current.stamp, text: current.current }
    store(outgoing.text)
    setState('saving')
    setIssue('')
    const task = (async () => {
      try {
        server.current = await write(outgoing)
        if (current.current === outgoing.text) {
          current.current = server.current.text
          setText(current.current)
          localSet(storageKey, null)
          setLocal(false)
          setState('saved')
        } else {
          store(current.current)
          setState('pending')
        }
      } catch (error) {
        const conflict = error instanceof ApiError && error.status === 409
        blocked.current = conflict
        setState(conflict ? 'conflict' : (!navigator.onLine || error instanceof TypeError) ? 'offline' : 'error')
        setIssue(message(error))
        throw error
      }
    })()
    inFlight.current = task
    try { await task }
    finally { if (inFlight.current === task) inFlight.current = null }
  }

  function accept(snapshot: Snapshot<T>, keep = false) {
    server.current = snapshot
    blocked.current = false
    setIssue('')
    if (keep && snapshot.text !== current.current) {
      store(current.current)
      setState('pending')
    } else {
      current.current = snapshot.text
      setText(snapshot.text)
      localSet(storageKey, null)
      setLocal(false)
      setState('saved')
    }
  }

  function discard() { localSet(storageKey, null) }

  useEffect(() => {
    if (!enabled || state !== 'pending') return
    const timer = window.setTimeout(() => { void persist(false).catch(() => {}) }, 680)
    return () => window.clearTimeout(timer)
  }, [state, text, enabled])
  useEffect(() => {
    if (!enabled) return
    const resume = () => { if (!blocked.current && current.current !== server.current.text) void persist(false).catch(() => {}) }
    window.addEventListener('online', resume)
    return () => window.removeEventListener('online', resume)
  }, [enabled, key])

  const stateText: Record<DraftState, string> = {
    empty: 'Tự động lưu khi bạn nhập', pending: local ? 'Đã lưu trên thiết bị · chờ đồng bộ' : 'Chờ lưu bản nháp',
    saving: 'Đang lưu…', saved: 'Đã lưu', offline: local ? 'Ngoại tuyến · đã giữ bản nháp trên thiết bị' : 'Chưa lưu được bản nháp khi ngoại tuyến',
    conflict: 'Có hai bản nháp khác nhau', error: local ? 'Lỗi lưu · bản nháp còn trên thiết bị' : 'Lỗi lưu · chưa ghi được vào bộ nhớ thiết bị',
  }
  return { text, change, flush, accept, discard, state, issue, stateText: stateText[state] }
}
