import assert from 'node:assert/strict'
import { createServer } from 'node:http'

// Fixture for the optional provider contract. It has no real credentials or external requests.
createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/v1/responses') { res.writeHead(404).end(); return }
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString())
    assert.equal(body.store, false)
    assert.equal(body.text.format.type, 'json_schema')
    assert.equal(body.text.format.strict, true)
    const prompt = JSON.parse(body.input)
    assert.deepEqual(Object.keys(prompt).filter(x => x !== 'code').sort(), ['answer', 'expected', 'question', 'rubric', 'rubricVersion', 'source'])
    assert.equal(prompt.rubric.length, 4)
    assert(prompt.answer.includes('Transient tạo mới'))
    const feedback = {
      criteria: [
        { status: 'scored', score: 3, finding: 'Đã phân biệt các lifetime chính.', evidence: 'Transient tạo mới' },
        { status: 'insufficient', score: null, finding: 'Cần làm rõ hệ quả của captive dependency.', evidence: null },
        { status: 'insufficient', score: null, finding: 'Cần một ví dụ BackgroundService.', evidence: null },
        { status: 'scored', score: 3, finding: 'Trả lời ngắn gọn.', evidence: 'Scoped theo request' },
      ],
      correct: ['Phân biệt transient và scoped.'], missing: ['Vòng đời của DbContext trong worker.'],
      incorrect: [], conditions: ['Scope tự tạo khi xử lý job nền.'], suggestions: ['Bổ sung ví dụ.'],
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
      status: 'completed', model: 'fixture-structured-v1', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(feedback) }] }],
    }))
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":"Unexpected fixture request"}')
  }
}).listen(5095, '127.0.0.1', () => console.log('AI fixture listening on 5095'))
