import assert from 'node:assert/strict'
import { updateQaDb } from './qa-sql.mjs'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { chromium, request } from 'playwright'

const base = process.env.IP_BASE ?? 'http://127.0.0.1:5094'
const host = new URL(base)
assert(['localhost', '127.0.0.1'].includes(host.hostname), 'Checks require a local instance.')
const artifacts = resolve(import.meta.dirname, '../../.impeccable/review')
const contentDir = resolve(import.meta.dirname, '../../server/Content')
const files = await readdir(contentDir)
async function seedRows(prefix) {
  const names = files.filter(f => f === prefix+'.json' || f.startsWith(prefix+'-batch-'))
  return (await Promise.all(names.map(async f=>JSON.parse(await readFile(resolve(contentDir,f),'utf8'))))).flat()
}
const questionCount = (await seedRows('questions')).length
const exerciseSeeds = await seedRows('exercises')
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({ ...(process.env.IP_BROWSER ? { channel: process.env.IP_BROWSER } : {}) })
const password = 'Check-' + randomUUID()
const errors = []
const contexts = []
let passed = 0
let skipped = 0
let learner
let partner

const web = async (options = {}) => {
  const context = await browser.newContext({ baseURL: base, ...options })
  contexts.push(context)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.setDefaultTimeout(8000)
  return { context, page }
}
async function check(title, work) {
  await work()
  console.log('PASS ' + title)
  passed++
}
function skip(title) {
  skipped++
  console.log('SKIP ' + title)
}
async function send(client, path, { method = 'GET', body, status = 200, csrf = true } = {}) {
  const headers = {}
  if (method !== 'GET' && csrf) {
    const token = await client.get('/api/auth/csrf')
    assert.equal(token.status(), 200)
    headers['X-CSRF-Token'] = (await token.json()).token
  }
  const response = await client.fetch('/api' + path, { method, headers, data: body })
  assert([status].flat().includes(response.status()), path + ' → ' + response.status() + ' ' + await response.text())
  return response.status() === 204 ? null : await response.json()
}
const visible = loc => loc.waitFor({ state: 'visible' })
const phrase = (page, text) => visible(page.getByText(text, { exact: true }).first())
const heading = (page, name) => visible(page.getByRole('heading', { name, exact: true }).first())
const button = (page, name) => page.getByRole('button', { name, exact: true })
const link = (page, name) => page.getByRole('link', { name, exact: true })
async function at(page, url) {
  const response = await page.goto(url)
  assert.equal(response.status(), 200)
}
async function fits(page) {
  const width = await page.locator('html').evaluate(element => [element.clientWidth, element.scrollWidth])
  assert(width[1] <= width[0], 'Horizontal overflow at ' + width.join('/'))
}

try {
  await check('catalog, seeded content and actual empty dashboard', async () => {
    const { context, page } = await web()
    const dashboard = await send(context.request, '/dashboard')
    assert.equal(dashboard.answers, 0)
    assert.equal(dashboard.completedMocks, 0)
    assert.equal(dashboard.questionCount, questionCount)
    assert.equal(dashboard.topics.length, 11)
    assert.equal((await send(context.request, '/interview-presets')).length, 11)
    assert.deepEqual(await send(context.request, '/questions/technologies'), ['.NET 10','ASP.NET Core 10','EF Core 10','HTTP','SQL Server 2022'])
    for(const kind of ['coding','sql']) assert.equal((await send(context.request, '/exercises?kind='+kind)).length, exerciseSeeds.filter(e=>e.kind===kind).length)
    const di = await send(context.request,'/questions?search=DI')
    assert(di.items.some(q=>q.slug==='di-scope-worker') && di.total===3)
    assert.equal((await send(context.request,'/questions?concept=di')).total,di.total)
    const question = await send(context.request, '/questions/di-lifetimes')
    assert.equal(question.reference, undefined)
    assert.equal(question.hint, undefined)
    await send(context.request, '/notes', { status: 401 })
    await at(page, '/')
    await heading(page, 'Tổng quan luyện tập')
    assert.equal(await link(page, 'Quản trị nội dung').count(), 0)
  })

  await check('dashboard at five widths, keyboard search and mobile navigation', async () => {
    for (const [width, height, name] of [[1440, 980, 'desktop'], [1024, 768, 'desktop-1024'], [768, 1024, 'tablet'], [390, 844, 'mobile-390'], [360, 800, 'mobile']]) {
      const { context, page } = await web({ viewport: { width, height }, isMobile: width === 360, hasTouch: width <= 768 })
      await at(page, '/')
      await heading(page, 'Tổng quan luyện tập')
      await visible(page.getByRole('link', {name:'Bắt đầu phiên học'}))
      await page.evaluate(() => document.fonts.ready)
      await fits(page)
      await page.screenshot({ path: resolve(artifacts, name + '.png'), fullPage: true, animations: 'disabled' })
      if (width === 360) {
        await button(page, 'Mở menu').click()
        const drawer = page.getByRole('dialog', { name: 'Điều hướng' })
        await visible(drawer)
        await drawer.getByRole('link', { name: 'Câu hỏi', exact: true }).click()
        await heading(page, 'Ngân hàng câu hỏi')
        await fits(page)
      }
      if (width === 1440) {
        await page.keyboard.press('Control+k')
        const dialog = page.getByRole('dialog', { name: 'Tìm câu hỏi' })
        await visible(dialog)
        await dialog.getByLabel('Từ khóa').fill('captive')
        await dialog.getByLabel('Từ khóa').evaluate(input => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true })))
        assert.equal(new URL(page.url()).pathname, '/')
        await dialog.getByLabel('Từ khóa').fill('Dependency Injection')
        await dialog.getByRole('button', { name: 'Tìm trong ngân hàng' }).click()
        await visible(page.getByRole('heading', { name: 'Vòng đời Dependency Injection', exact: true }))
        await page.getByLabel('Chủ đề').selectOption('sql')
        await heading(page, 'Không tìm thấy câu hỏi')
      }
      await context.close()
    }
  })

  await check('signup, CSRF, owner-only endpoints and account settings', async () => {
    learner = await web({ viewport: { width: 1440, height: 900 } })
    partner = await request.newContext({ baseURL: base })
    const { context, page } = learner
    await send(context.request, '/auth/register', { method: 'POST', body: {}, status: 400, csrf: false })
    await at(page, '/dang-nhap?next=%2Fcai-dat')
    await button(page, 'Tạo tài khoản mới').click()
    const email = 'study-' + randomUUID() + '@example.test'
    await page.getByLabel('Tên hiển thị').fill('Học viên kiểm thử')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Mật khẩu').fill(password)
    await button(page, 'Tạo tài khoản').click()
    await heading(page, 'Mục tiêu luyện tập')
    await page.getByLabel('Vị trí muốn ứng tuyển').fill('Junior .NET Developer')
    await page.getByLabel('Mức mục tiêu').selectOption('junior')
    await page.getByLabel('Phút học mỗi ngày').fill('20')
    await page.getByLabel('Ngày luyện mỗi tuần').fill('5')
    await page.getByLabel('Múi giờ').fill('Asia/Bangkok')
    await button(page, 'Lưu mục tiêu').click()
    await phrase(page, 'Đã lưu mục tiêu')
    assert.equal((await send(context.request, '/profile')).minutesPerDay, 20)
    assert.equal((await send(context.request, '/auth/me')).user.email, email)
    await send(context.request, '/admin/questions', { status: 403 })
    await send(partner, '/auth/register', { method: 'POST', body: {
      displayName: 'Người học thứ hai', email: 'other-' + randomUUID() + '@example.test', password,
    }, status: 201 })
  })

  let attemptId
  let noteId
  await check('draft, recovery after refresh and offline, plus conflict across tabs', async () => {
    const { page, context } = learner
    await at(page, '/cau-hoi/di-lifetimes')
    await heading(page, 'Vòng đời Dependency Injection')
    const answer = page.getByRole('textbox', { name: 'Câu trả lời của bạn' })
    await answer.fill('Scoped theo request. Singleton chia sẻ trong container.')
    await phrase(page, 'Đã lưu')
    await page.reload()
    await visible(answer)
    assert.equal(await answer.inputValue(), 'Scoped theo request. Singleton chia sẻ trong container.')
    await context.setOffline(true)
    await answer.fill('Scoped theo request. Câu trả lời được giữ khi ngoại tuyến.')
    await phrase(page, 'Ngoại tuyến · đã giữ bản nháp trên thiết bị')
    await context.setOffline(false)
    await phrase(page, 'Đã lưu')
    const tab = await context.newPage()
    await at(tab, '/cau-hoi/di-lifetimes')
    const other = tab.getByRole('textbox', { name: 'Câu trả lời của bạn' })
    await visible(other)
    const original = 'Transient tạo mới. Scoped theo request. Singleton sống cùng container.'
    await answer.fill(original)
    await phrase(page, 'Đã lưu')
    await other.fill('Bản cũ từ tab khác.')
    await phrase(tab, 'Có hai bản nháp khác nhau')
    await button(tab, 'Dùng bản máy chủ').click()
    await tab.waitForFunction(value => document.querySelector('textarea').value === value, original)
    await tab.close()
    await answer.evaluate(input => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true })))
    assert.equal(new URL(page.url()).pathname, '/cau-hoi/di-lifetimes')
    assert.equal((await send(context.request, '/practice/questions/di-lifetimes')).draft.text, original)
  })

  await check('submit, reference evidence, revision, notes and the review queue', async () => {
    const { page, context } = learner
    await button(page, 'Xin gợi ý').click()
    await phrase(page, 'Suy nghĩ theo request và vòng đời của container.')
    await button(page, 'Nộp câu trả lời').click()
    await page.waitForURL('**/luot-luyen/*')
    attemptId = new URL(page.url()).pathname.split('/').pop()
    await heading(page, 'Câu trả lời đã nộp')
    assert.equal(await page.getByRole('heading', { name: 'Đáp án tham khảo' }).count(), 0)
    await button(page, 'Xem đáp án và rubric').click()
    await heading(page, 'Đáp án tham khảo')
    await page.getByText('Rubric 0–4 · phiên bản 1', { exact: true }).click()
    await phrase(page, 'Tính đúng kỹ thuật')
    await button(page, 'Hiểu một phần').click()
    await page.waitForFunction(() => document.querySelector('button[aria-pressed="true"]')?.textContent.includes('Hiểu một phần'))
    await button(page, 'Viết bản cải thiện').click()
    await page.getByLabel('Bản cải thiện của bạn').fill('BackgroundService tạo scope cho từng đơn vị công việc.')
    await button(page, 'Lưu bản cải thiện').click()
    await visible(page.getByText(/^Bản 1 · /))
    let saved = await send(context.request, '/practice/attempts/' + attemptId)
    assert.equal(saved.text, 'Transient tạo mới. Scoped theo request. Singleton sống cùng container.')
    assert.equal(saved.hintSeen, true)
    assert.equal(saved.answerSeen, false)
    assert(saved.referenceViewedAt)
    assert.equal(saved.revisions.length, 1)
    await page.getByLabel('Ngày ôn').fill('2020-01-01')
    await button(page, 'Lưu lịch ôn').click()
    await phrase(page, 'Đã lưu ngày ôn')
    await link(page, 'Thêm ghi chú').click()
    await page.getByLabel('Nội dung', { exact: true }).fill('Cần minh họa scope của worker và vòng đời DbContext.')
    await page.getByRole('checkbox', { name: 'Ghi chú quan trọng' }).check()
    await button(page, 'Lưu ghi chú').click()
    await heading(page, 'Vòng đời Dependency Injection')
    await page.getByLabel('Tìm ghi chú').fill('worker')
    await button(page, 'Tìm kiếm').click()
    await heading(page, 'Vòng đời Dependency Injection')
    const notes = await send(context.request, '/notes?search=worker')
    assert.equal(notes.total, 1)
    noteId = notes.items[0].id
    await at(page, '/on-tap')
    await heading(page, 'Vòng đời Dependency Injection')
    const dashboard = await send(context.request, '/dashboard')
    assert.equal(dashboard.answers, 1)
    assert.equal(dashboard.dueCount, 1)
    await send(partner, '/practice/attempts/' + attemptId, { status: 404 })
    await send(partner, '/notes/' + noteId + '?revision=1', { method: 'DELETE', status: 404 })
    assert.equal((await send(partner, '/notes')).total, 0)
    saved = await send(context.request, '/history')
    assert.equal(saved.items[0].assessmentSource, 'Tự đánh giá')
  })

  await check('idempotent concurrent submit and skip as a separate outcome', async () => {
    const { context } = learner
    const client = context.request
    const slug = 'resource-authorization'
    const cursor = { id: randomUUID(), revision: 0, version: 1 }
    const guidance = await send(client, '/practice/questions/' + slug + '/reveal', { method: 'POST', body: { cursor, kind: 'answer' } })
    const draft = await send(client, '/practice/questions/' + slug + '/draft', { method: 'PATCH', body: {
      cursor: guidance.cursor, text: 'Lọc theo cả khóa tài nguyên và ID của người dùng.',
    } })
    const body = { cursor: draft.cursor, language: 'vi', skip: false, activeSeconds: 0 }
    const [a, b] = await Promise.all([0, 1].map(() => send(client, '/practice/questions/' + slug + '/submit', { method: 'POST', body, status: [200, 201] })))
    assert.equal(a.id, b.id)
    assert.equal(a.answerSeen, true)
    const skippedAttempt = await send(client, '/practice/questions/sql-null/submit', { method: 'POST', status: 201,
      body: { cursor: { id: randomUUID(), revision: 0, version: 1 }, language: 'vi', skip: true, activeSeconds: 0 } })
    assert.equal(skippedAttempt.outcome, 'skipped')
    const history = await send(client, '/history')
    assert.equal(history.total, 3)
    assert.equal((await send(client, '/dashboard')).answers, 2)
  })

  await check('AI source is separate and access is checked before calling the provider', async () => {
    const client = learner.context.request
    const path = '/practice/attempts/' + attemptId + '/ai-feedback'
    const enabled = process.env.IP_AI_FIXTURE === '1'
    assert.equal((await send(client, '/ai/status')).available, enabled)
    assert.equal((await send(client, path)).feedback, undefined)
    await send(partner, path, { method: 'POST', status: 404 })
    if (!enabled) {
      await send(client, path, { method: 'POST', status: 503 })
      return
    }
    const result = await send(client, path, { method: 'POST' })
    assert.equal(result.model, 'fixture-structured-v1')
    assert.equal(result.rubricVersion, 1)
    assert.equal(result.body.criteria.length, 4)
    assert.match(result.body.criteria[0].evidence, /Transient tạo mới/)
    assert.deepEqual((await send(client, path)).feedback, result)
    assert.deepEqual(await send(client, path, { method: 'POST' }), result)
    assert.equal((await send(client, '/practice/attempts/' + attemptId)).rating, 'partial')
    await at(learner.page, '/luot-luyen/' + attemptId)
    await heading(learner.page, 'Nhận xét AI')
    await phrase(learner.page, 'Nguồn AI · rubric v1')
  })

  let mockId
  await check('guided mock in English, pause survives refresh, one follow-up and early finish', async () => {
    const { page } = learner
    await at(page, '/phong-van')
    await visible(page.getByRole('button', { name: /^Nền tảng \.NET/ }))
    await page.getByRole('combobox', { name: 'Ngôn ngữ', exact: true }).selectOption('en')
    for (const topic of ['C# & .NET', 'OOP & Thiết kế', 'LINQ & Async'])
      await page.getByRole('checkbox', { name: topic, exact: true }).uncheck()
    await page.getByRole('checkbox', { name: 'SQL & Database', exact: true }).check()
    await button(page, 'Bắt đầu phỏng vấn').click()
    await page.waitForURL('**/phong-van/*')
    mockId = new URL(page.url()).pathname.split('/').pop()
    const answer = page.getByRole('textbox', { name: 'Câu trả lời' })
    await answer.fill('A scoped service is resolved once per scope.')
    await button(page, 'Tạm dừng').click()
    await phrase(page, 'Đã tạm dừng')
    const paused = await page.locator('.session-clock').innerText()
    await page.reload()
    await phrase(page, 'Đã tạm dừng')
    assert.equal(await page.locator('.session-clock').innerText(), paused)
    assert.match(await answer.inputValue(), /scoped service/)
    await button(page, 'Tiếp tục').click()
    await button(page, 'Gửi câu trả lời').click()
    await heading(page, 'Câu hỏi đào sâu')
    await page.reload()
    await heading(page, 'Câu hỏi đào sâu')
    await answer.fill('This depends on the service boundary.')
    await button(page, 'Gửi câu trả lời').click()
    await heading(page, 'Đối chiếu câu 1')
    await heading(page, 'Đáp án tham khảo')
    await button(page, 'Câu tiếp theo').click()
    await phrase(page, 'Câu 2 / 3')
    await button(page, 'Kết thúc sớm').click()
    await button(page, 'Kết thúc phiên').click()
    await heading(page, 'Báo cáo phỏng vấn')
    await phrase(page, 'Chưa đánh giá')
    await send(partner, '/interviews/' + mockId, { status: 404 })
    await link(page, 'Tạo phiên ôn').click()
    await button(page, 'Bắt đầu phỏng vấn').click()
    await page.waitForURL('**/phong-van/*')
    const reviewId = new URL(page.url()).pathname.split('/').pop()
    const followOn = await send(learner.context.request, '/interviews/' + reviewId)
    assert.equal(followOn.current.topic, 'sql')
  })

  await check('interview mode withholds the rubric and completes once', async () => {
    const { context } = learner
    const client = context.request
    const start = { id: randomUUID(), preset: 'backend', level: 'junior', topics: [], difficulty: null, language: 'vi', minutes: 15, mode: 'mock', reviewOf: null }
    let data = await send(client, '/interviews', { method: 'POST', body: start, status: 201 })
    const basePath = '/interviews/' + data.session.id
    assert.equal((await send(client, '/interviews', { method: 'POST', body: start })).session.id, data.session.id)
    assert.equal(data.current.reference, undefined)
    assert.equal(data.report, undefined)
    await send(client, basePath + '/actions', { method: 'POST', status: 400, body: { id: randomUUID(), revision: data.revision, action: 'hint' } })
    for (let i = 0; i < 3; i++) {
      assert.equal(data.position, i)
      const command = { id: randomUUID(), revision: data.revision, action: i === 0 ? 'answer' : 'skip', text: i === 0 ? 'Chưa biết' : '' }
      data = await send(client, basePath + '/actions', { method: 'POST', body: command })
      assert.deepEqual((await send(client, basePath + '/actions', { method: 'POST', body: command })).report, data.report)
    }
    assert.equal(data.session.status, 'completed')
    assert.equal(data.report.filter(x => x.status === 'skipped').length, 2)
    assert(data.report.every(x => !x.rating && !x.score))
    assert.equal((await send(client, '/dashboard')).completedMocks, 1)
  })

  if (process.env.IP_QA_DB === 'InterviewPractice_QA') {
    await check('server-owned deadline expires a persisted session', async () => {
      const { context } = learner
      const data = await send(context.request, '/interviews', { method: 'POST', status: 201, body: {
        id: randomUUID(), preset: 'foundation', level: 'junior', topics: [], language: 'vi', minutes: 15, mode: 'mock',
      } })
      updateQaDb("UPDATE Interviews SET Deadline = DATEADD(second, -1, SYSDATETIMEOFFSET()) WHERE Id = '" + data.session.id + "';")
      const ended = await send(context.request, '/interviews/' + data.session.id)
      assert.equal(ended.session.status, 'expired')
      assert.equal(ended.report[0].status, 'unanswered')
    })
  } else skip('deadline fixture requires IP_QA_DB=InterviewPractice_QA')

  await check('mobile C# editor, saved code, separate SQL dataset and no execution verdict', async () => {
    const { page, context } = learner
    await page.setViewportSize({ width: 360, height: 780 })
    await at(page, '/coding/frequency-map')
    await button(page, 'Code').click()
    const editor = page.getByRole('textbox', { name: 'Mã trả lời' })
    await visible(editor)
    await fits(page)
    const sample = 'public static string[] UniqueCodes(string[] codes) => codes;'
    await editor.focus()
    await editor.press('Control+a')
    await page.keyboard.insertText(sample)
    await editor.press('Control+s')
    await phrase(page, 'Đã lưu')
    assert.equal((await send(context.request, '/exercises/frequency-map')).draft.text.trimEnd(), sample)
    assert.equal(await button(page, 'Run').isDisabled(), true)
    assert.equal(await button(page, 'Submit').isDisabled(), true)
    await page.screenshot({ path: resolve(artifacts, 'mobile-editor.png'), fullPage: true, animations: 'disabled' })
    await button(page, 'Đặt lại mã khởi đầu').click()
    await visible(page.getByRole('dialog', { name: 'Đặt lại mã khởi đầu?' }))
    await page.keyboard.press('Escape')
    assert.equal((await editor.innerText()).trimEnd(), sample)
    await at(page, '/sql/customer-orders')
    await page.getByText('Dữ liệu mẫu', { exact: true }).click()
    await visible(page.getByRole('table',{ name:'#Customers' }))
    await page.getByText('Lệnh tạo dữ liệu',{exact:true}).click()
    await visible(page.getByText(/INSERT #Customers/))
    await button(page, 'Kết quả').click()
    await heading(page, 'Kết quả thực thi')
    await phrase(page, 'Chưa cấu hình runner')
    await fits(page)
    const sql = await send(context.request, '/exercises/customer-orders')
    assert.match(sql.card.runtime, /SQL Server 2022/)
    assert.equal(sql.runnerAvailable, false)
    assert(!sql.reference)
    assert.equal((await send(context.request, '/external-practice')).length, 4)
  })

  if (process.env.IP_ADMIN_EMAIL && process.env.IP_ADMIN_PASSWORD) {
    await check('admin publishes versions; old attempt and rubric stay unchanged', async () => {
      const admin = await request.newContext({ baseURL: base })
      try {
        const account = await send(admin, '/auth/login', { method: 'POST', body: { email: process.env.IP_ADMIN_EMAIL, password: process.env.IP_ADMIN_PASSWORD } })
        assert.equal(account.admin, true)
        await send(admin, '/practice/attempts/' + attemptId, { status: 404 })
        const { content } = await send(admin, '/admin/questions/di-lifetimes')
        const slug = 'check-' + randomUUID()
        const adminPath = '/admin/questions/' + slug
        const practicePath = '/practice/questions/' + slug
        const client = learner.context.request
        const transition = (revision, status) => send(admin, adminPath + '/publication', { method: 'POST', body: { revision, status } })
        const review = async revision => transition((await transition(revision, 'needs-review')).revision, 'verified')
        const v1 = await send(admin, adminPath, { method: 'PUT', status: 201, body: { revision: 0, content } })
        await send(client, '/questions/' + slug, { status: 404 })
        const published = await transition((await review(v1.revision)).revision, 'published')
        const draft = await send(client, practicePath + '/draft', { method: 'PATCH', body: {
          cursor: { id: randomUUID(), revision: 0, version: 1 }, text: 'Nội dung luyện ở v1.',
        } })
        const attempt = await send(client, practicePath + '/submit', { method: 'POST', status: 201, body: {
          cursor: draft.cursor, language: 'vi', skip: false, activeSeconds: 0,
        } })
        const v2 = await send(admin, adminPath, { method: 'PUT', body: {
          revision: published.revision, content: { ...content, title: 'Kiểm tra nội dung v2', rubric: ['Mới', ...content.rubric.slice(1)] },
        } })
        assert.equal((await send(client, '/questions/' + slug)).card.version, 1)
        const checked = await review(v2.revision)
        assert.equal((await send(client, '/questions/' + slug)).card.version, 1)
        const publishedAgain = await transition(checked.revision, 'published')
        assert.equal((await send(client, '/questions/' + slug)).card.version, 2)
        const reference = await send(client, '/practice/attempts/' + attempt.id + '/reference', { method: 'POST' })
        assert.equal(reference.version, 1)
        assert.equal(reference.rubric[0], content.rubric[0])
        const retired = await transition(publishedAgain.revision, 'retired')
        await send(client, '/questions/' + slug, { status: 404 })
        assert.equal((await send(client, '/practice/attempts/' + attempt.id)).question.card.version, 1)
        const restored = await transition((await review(retired.revision)).revision, 'published')
        assert.equal((await send(client, '/questions/' + slug)).card.version, 2)
        assert.equal((await send(client, '/practice/attempts/' + attempt.id)).question.card.version, 1)
        await transition(restored.revision, 'retired')
      } finally { await admin.dispose() }
    })
  } else skip('admin fixture not configured')

  await check('personal export, password-confirmed deletion and shared catalog survives', async () => {
    const client = learner.context.request
    const exported = await send(client, '/profile/export')
    assert(exported.attempts.some(x => x.id === attemptId))
    assert(exported.notes.some(x => x.id === noteId))
    await send(client, '/profile/account/delete', { method: 'POST', body: { password: 'incorrect' }, status: 400 })
    await send(client, '/profile/account/delete', { method: 'POST', body: { password }, status: 204 })
    await send(client, '/history', { status: 401 })
    assert.equal((await send(partner, '/questions')).total, questionCount)
    await send(partner, '/profile/account/delete', { method: 'POST', body: { password }, status: 204 })
    assert.deepEqual(errors, [])
  })
  console.log('Passed: ' + passed + ', Failed: 0, Skipped: ' + skipped)
} finally {
  await partner?.dispose()
  await Promise.allSettled(contexts.map(context => context.close()))
  await browser.close()
}
