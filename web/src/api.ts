import { useEffect, useRef, useState } from 'react'

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public correlationId?: string) {
    super(message)
  }
}

let csrf: Promise<string> | undefined
export function resetCsrf() { csrf = undefined }

type RequestOptions = { method?: string; body?: unknown; signal?: AbortSignal }

export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (method !== 'GET' && method !== 'HEAD') {
    csrf ??= api<{ token: string }>('/auth/csrf').then(x => x.token).catch(error => {
      resetCsrf()
      throw error
    })
    headers.set('X-CSRF-Token', await csrf)
  }
  const response = await fetch('/api' + path, { method, headers, credentials: 'same-origin',
    signal: options.signal, body: options.body === undefined ? undefined : JSON.stringify(options.body) })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as {
      title?: string; code?: string; correlationId?: string; errors?: Record<string, string[]>
    } | null
    if (problem?.code === 'csrf' && !retried) {
      resetCsrf()
      return api<T>(path, options, true)
    }
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('practice:session-expired'))
    const defaults: Record<number, string> = {
      400: 'Dữ liệu nhập chưa hợp lệ.', 401: 'Hãy đăng nhập lại để tiếp tục.', 403: 'Tài khoản chưa có quyền thực hiện thao tác này.',
      404: 'Không tìm thấy nội dung.', 409: 'Dữ liệu đã đổi. Hãy tải lại rồi thử lại.', 429: 'Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.',
    }
    const fields = problem?.errors
    const message = problem?.code ? problem.title : fields ? 'Kiểm tra các trường bắt buộc và giới hạn độ dài.' : defaults[response.status]
    throw new ApiError(response.status, message ?? 'Không kết nối được dịch vụ. Hãy thử lại.',
      problem?.code, problem?.correlationId ?? response.headers.get('X-Correlation-Id') ?? undefined)
  }
  if (response.status === 204) return undefined as T
  return await response.json() as T
}

export function message(error: unknown) {
  if (error instanceof ApiError) return error.message + (error.status >= 500 && error.correlationId ? ' · Mã ' + error.correlationId : '')
  return 'Kết nối bị gián đoạn. Kiểm tra mạng rồi thử lại.'
}

export function useResource<T>(path: string | null) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ path: string; revision: number; data?: T; error?: string }>({ path: '', revision: 0 })
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    api<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ path, revision, data })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ path, revision, error: message(error) })
    })
    return () => controller.abort()
  }, [path, revision])
  const current = state.path === path && state.revision === revision
  return { data: current ? state.data : undefined, error: current ? state.error : undefined, loading: Boolean(path) && !current,
    reload: () => setRevision(x => x + 1) }
}

export function useAction() {
  const inFlight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(work: () => Promise<unknown>) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try { await work() }
    catch (err) { setError(message(err)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return { busy, error, run, clearError: () => setError('') }
}

export function localGet<T>(key: string) {
  try {
    const text = localStorage.getItem(key)
    return text ? JSON.parse(text) as T : null
  } catch { return null }
}

export function localSet(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch { return false }
}

export function clearPersonalDrafts(owner: string) {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith('ip:' + owner + ':')) localStorage.removeItem(key)
  } catch { /* Thiết bị có thể chặn bộ nhớ cục bộ. */ }
}
