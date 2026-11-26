import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { request } from 'playwright'

const base = process.env.IP_BASE ?? 'http://127.0.0.1:5094'
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const path = resolve(import.meta.dirname, '../../.artifacts/upgrade-fixture.json')
const before = process.argv[2] === 'before'
assert(before || process.argv[2] === 'after')
const previous = before ? null : JSON.parse(await readFile(path, 'utf8'))
const client = await request.newContext({ baseURL: base, storageState: previous?.cookies })
async function send(url, method = 'GET', data) {
  const csrf = await (await client.get('/api/auth/csrf')).json()
  const res = await client.fetch('/api' + url, { method, data, headers: { 'X-CSRF-Token': csrf.token } })
  assert(res.ok(), url + ' ' + res.status() + ' ' + await res.text())
  return res.status() === 204 ? null : res.json()
}
try {
  const slug = 'di-lifetimes'
  if (before) {
    const password = randomUUID() + 'qa'
    const email = randomUUID() + '@example.test'
    await send('/auth/register', 'POST', { displayName: 'Migration QA', email, password })
    const q = await send('/questions/' + slug)
    const cursor = { id: randomUUID(), revision: 0, version: q.card.version }
    const text = 'Một scope giữ cùng instance cho các lần resolve trong scope đó.'
    const draft = await send('/practice/questions/' + slug + '/draft', 'PATCH', { cursor, text })
    const attempt = await send('/practice/questions/' + slug + '/submit', 'POST', { cursor: draft.cursor, language: 'vi', skip: false, activeSeconds: 0 })
    await send('/practice/attempts/' + attempt.id + '/assessment', 'PUT', { rating: 'clear' })
    await send('/practice/questions/' + slug + '/mark', 'PUT', { due: '2030-01-12', setDue: true })
    const reference = await send('/practice/attempts/' + attempt.id + '/reference', 'POST')
    await writeFile(path, JSON.stringify({ id: attempt.id, text, reference, email, password }))
    console.log('PASS created versioned attempt, rating and manual date on previous schema')
  } else {
    if (previous.email) await send('/auth/login', 'POST', { email: previous.email, password: previous.password })
    const attempt = await send('/practice/attempts/' + previous.id)
    assert.equal(attempt.text, previous.text)
    assert.equal(attempt.rating, 'clear')
    assert.equal(attempt.question.card.due, '2030-01-12')
    assert.equal(attempt.question.card.mastery, 'self')
    const exported = await send('/profile/export')
    assert.match(exported.attempts.find(a => a.id === previous.id).studyDay, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(attempt.question.card.verifiedDays, 0)
    assert.deepEqual(await send('/practice/attempts/' + previous.id + '/reference', 'POST'), previous.reference)
    await send('/profile/account/delete', 'POST', { password: previous.password })
    await unlink(path)
    console.log('PASS migration preserved answer, confidence, manual review date, rubric version and owner')
  }
} finally { await client.dispose() }
