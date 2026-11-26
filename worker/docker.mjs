import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'

export class Verdict extends Error {
  constructor(status, message = status) { super(message); this.status = status }
}

// Docker is invoked only by the trusted controller. Candidate bytes always travel over stdin.
export function docker(args, { input = '', signal, timeout = 15000, limit = 65536, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted()
    const child = spawn('docker', args, { stdio: ['pipe','pipe','pipe'], windowsHide: true, env: {...process.env, ...env} })
    const out = [], err = []
    let bytes = 0, fault
    const stop = status => { fault ??= new Verdict(status); child.kill('SIGKILL') }
    const abort = () => stop('cancelled')
    const timer = setTimeout(() => stop('timeout'), timeout)
    signal?.addEventListener('abort', abort, {once:true})
    const append = list => chunk => {
      bytes += chunk.length
      if (bytes <= limit) list.push(chunk)
      else stop('output_limit')
    }
    child.stdout.on('data', append(out))
    child.stderr.on('data', append(err))
    child.on('error', e => { fault ??= e })
    child.stdin.on('error', () => {}) // A stopped sandbox may close stdin before accepting the whole input.
    child.on('close', code => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (fault) reject(fault)
      else resolve({code, stdout:Buffer.concat(out).toString('utf8'), stderr:Buffer.concat(err).toString('utf8')})
    })
    child.stdin.end(input)
  })
}

export async function checked(args, options) {
  const result = await docker(args, options)
  if (result.code !== 0) throw new Error('Docker operation failed: '+args[0])
  return result.stdout.trim()
}

export const label = 'org.interview-practice.worker'
export function restrictions(instance, sql = false) {
  return ['--label',label+'='+instance,'--network','none','--read-only','--cap-drop','ALL',
    ...(sql?['--cap-add','NET_BIND_SERVICE']:[]),'--security-opt','no-new-privileges=true','--cpus',sql?'2':'1','--memory',sql?'3g':'384m',
    '--memory-swap',sql?'3g':'384m','--pids-limit',sql?'384':'64','--user',sql?'10001:0':'1654:1654',
    '--ulimit','nofile='+(sql?'4096:4096':'512:512'),'--ulimit','fsize='+(sql?'1073741824:1073741824':'268435456:268435456'),
    '--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777','--init']
}

export async function recover(instance) {
  const ids = await checked(['ps','-aq','--filter','label='+label+'='+instance])
  for (const id of ids.split(/\s+/).filter(Boolean)) await checked(['rm','-fv',id])
}

export async function isolated(image, options, run) {
  const name = 'ip-job-'+randomUUID()
  // The name is allocated before create so cleanup also covers cancellation during startup.
  try {
    await checked(['create','--name',name,'--pull','never',...options.flags,image,...options.command], {env:options.env})
    return await run(name)
  } finally {
    const deleted=await docker(['rm','-fv',name])
    if (deleted.code !== 0 && !deleted.stderr.includes('No such container')) throw new Error('Docker cleanup failed')
  }
}
