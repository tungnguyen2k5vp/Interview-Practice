import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { sqlTypesV3 } from './sql-types-v3.mjs'
import { sqlTypesV4 } from './sql-types-v4.mjs'

const root = resolve(import.meta.dirname, '../..')
const draftDirs = process.argv.flatMap((value,index)=>value==='--drafts'?[resolve(root,process.argv[index+1] ?? '')]:[])
const drafts = pattern => draftDirs.flatMap(dir=>readdirSync(dir).filter(f=>pattern.test(f))
  .sort().flatMap(f=>JSON.parse(readFileSync(join(dir,f),'utf8'))))
const data = name => JSON.parse(readFileSync(join(root, 'server', 'Content', name + '.json'), 'utf8'))
const publishedBatches = name => readdirSync(join(root,'server','Content')).filter(f=>f.startsWith(name+'-batch-') && f.endsWith('.json'))
  .sort().flatMap(f=>data(f.slice(0,-5)))
const original = data('questions')
const batch = data('questions-batch-02')
const newBatches = readdirSync(join(root,'server','Content')).filter(name => /^questions-batch-.*\.json$/.test(name) && name !== 'questions-batch-02.json')
  .sort().flatMap(name => data(name.slice(0,-5))).concat(drafts(/^questions-batch-.*\.json$/))
const questions = [...original, ...batch, ...newBatches]
const exercises = [ ...data('exercises'), ...readdirSync(join(root,'server','Content')).filter(name=>/^exercises-batch-.*\.json$/.test(name))
  .sort().flatMap(name=>data(name.slice(0,-5))), ...drafts(/^exercises-batch-.*\.json$/) ]
assert.equal(original.length, 44)
assert.equal(batch.length, 14)
assert.equal(new Set(questions.map(x => x.slug)).size, questions.length)
assert.equal(new Set(questions.map(x => x.content.topic)).size, 11)
assert.equal(new Set(questions.map(x => x.content.prompt.trim().toLowerCase())).size, questions.length)
function tokens(text) {
  const words=text.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  return new Set(words.slice(1).map((w,i) => words[i]+' '+w))
}
for (const field of ['prompt','englishPrompt']) {
  const signatures=questions.map(q=>tokens(q.content[field]))
  for(let i=0;i<questions.length;i++) for(let j=0;j<i;j++){
    const a=signatures[i], b=signatures[j]
    const common=[...a].filter(pair=>b.has(pair)).length
    assert(2*common/(a.size+b.size) < 0.88, 'Similar '+field+': '+questions[j].slug+' / '+questions[i].slug)
  }
}
const slugs = new Set(questions.map(x => x.slug))
const knowledgeChecks = [...data('knowledge-checks'), ...readdirSync(join(root,'server','Content'))
  .filter(f=>/^knowledge-checks-batch-.*\.json$/.test(f)).flatMap(f=>data(f.slice(0,-5))),...drafts(/^knowledge-checks-batch-.*\.json$/)]
assert.equal(new Set(knowledgeChecks.map(x => x.slug + '@' + x.version)).size, knowledgeChecks.length)
for (const q of questions.filter(x => !x.content.quiz)) assert(knowledgeChecks.some(c => c.slug === q.slug && c.version === 1), q.slug)
for (const c of knowledgeChecks) {
  assert(slugs.has(c.slug) && c.version === 1 && c.prompt && c.englishPrompt && c.explanation && c.englishExplanation, c.slug)
  assert.equal(c.choices.length, c.englishChoices.length)
  assert(c.choices.length >= 2 && c.choices.length <= 6 && Number.isInteger(c.correctIndex) && c.choices[c.correctIndex])
  assert.equal(new Set(c.choices).size,c.choices.length)
  assert.equal(new Set(c.englishChoices).size,c.choices.length)
}
const prerequisites = new Map(questions.map(q=>[q.slug,q.content.prerequisites ?? []]))
const visited = new Set(), active = new Set()
function visit(slug) {
  assert(slugs.has(slug), 'Unknown prerequisite '+slug)
  assert(!active.has(slug), 'Circular prerequisites at '+slug)
  if(visited.has(slug)) return
  active.add(slug)
  for(const dependency of prerequisites.get(slug)) visit(dependency)
  active.delete(slug); visited.add(slug)
}
for(const {slug,content} of questions) {
  visit(slug)
  assert(['intern','fresher','junior','mid','senior'].includes(content.level),slug)
  assert(['easy','medium','hard'].includes(content.difficulty),slug)
}
const topics = new Set(['csharp','oop','linq','aspnet','efcore','sql','algorithms','systems','delivery','behavioral','testing'])
const formats = new Set(['concept','compare','read','debug','predict','design','experience','quiz'])
for (const {slug,content:c} of questions) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && topics.has(c.topic) && formats.has(c.format),slug)
  assert(c.tags?.length && c.tags.every(s=>s.trim()) && c.shortAnswer?.trim() && c.explanation?.trim(),slug)
}
const concepts = data('concepts'), byConcept = new Map(concepts.map(c=>[c.id,c]))
assert.equal(byConcept.size,concepts.length)
const aliases = new Set()
function checkConcept(id,path) {
  const c = byConcept.get(id)
  assert(c && !path.includes(id),'Unknown concept or cycle: '+[...path,id].join(' → '))
  for(const key of c.prerequisites) checkConcept(key,[...path,id])
}
for(const c of concepts) {
  checkConcept(c.id,[])
  assert(c.questions.length >= 2 && new Set(c.questions).size===c.questions.length && c.questions.every(s=>slugs.has(s)),c.id)
  for(const word of new Set(c.aliases.map(a=>a.toLowerCase()))) {
    assert(word.trim() && !aliases.has(word),'Ambiguous alias '+word); aliases.add(word)
  }
  if(c.exercise) assert(exercises.some(e=>e.kind+'/'+e.slug===c.exercise),c.id)
  if(c.review) assert([...data('code-reviews'),...publishedBatches('code-reviews')].some(r=>r.slug===c.review),c.id)
}
const scenarios=[...data('project-scenarios'),...publishedBatches('project-scenarios')]
assert.equal(new Set(scenarios.map(s=>s.slug)).size,scenarios.length)
for(const s of scenarios) assert(s.brief && s.prompt && s.rubric && s.followUp && s.questions.every(q=>slugs.has(q)),s.slug)
const reviews=[...data('code-reviews'),...publishedBatches('code-reviews')]
const designs=[...data('system-design'),...publishedBatches('system-design')]
const presets=publishedBatches('interview-presets')
for(const rows of [reviews,designs]) assert.equal(new Set(rows.map(r=>r.slug+'@'+r.version)).size,rows.length)
for(const r of reviews) {
  const count=r.diff.filter(line=>!line.startsWith('-')).length
  assert(r.lines.length && r.lines.every(line=>line>=1 && line<=count) && r.cause!==r.otherCause && r.repair!==r.otherRepair,r.slug)
}
for(const d of designs) assert(d.brief && d.requirements.length && d.rubric.length===5 && new Set(d.rubric).size===5,d.slug)
assert.equal(new Set(presets.map(p=>p.id)).size,presets.length)
for(const p of presets) assert(p.suggested.length && p.suggested.every(slug=>questions.some(q=>q.slug===slug && p.topics.includes(q.content.topic))),p.id)
for (const {slug, content: c} of [...batch, ...newBatches]) {
  assert(c.nextHint && c.nextHint !== c.hint && c.context && c.trap && c.explanation && c.alternative, slug)
  assert(c.prerequisites.concat(c.related).every(k => k !== slug && slugs.has(k)), slug)
  assert(c.rubric.length === new Set(c.rubric).size && c.minutes >= 1 && c.minutes <= 60)
  if (c.quiz) {
    assert.equal(c.quiz.vi.length, c.quiz.en.length)
    assert(c.quiz.vi.length >= 2 && Number.isInteger(c.quiz.correctIndex) && c.quiz.vi[c.quiz.correctIndex] && c.quiz.en[c.quiz.correctIndex])
    if(c.quiz.correctIndices) {
      const correct=c.quiz.correctIndices
      assert(correct.length>=2 && correct.length<c.quiz.vi.length && new Set(correct).size===correct.length && correct.includes(c.quiz.correctIndex),slug)
      assert(correct.every(i=>Number.isInteger(i) && i>=0 && i<c.quiz.vi.length) && c.quiz.reasons?.length===c.quiz.vi.length && c.quiz.reasons.every(x=>x.trim()),slug)
    }
    for (const options of [c.quiz.vi,c.quiz.en]) assert(options.every(o=>typeof o==='string' && o.trim()) && new Set(options).size===options.length, slug)
  }
}
for (const { content } of questions) {
  assert.equal(content.rubric.length, 4)
  assert(content.englishPrompt && content.englishFollowUp && content.hint)
  assert.equal(new URL(content.source).protocol, 'https:')
}

if (process.argv.includes('--sources')) {
  const manifestIndex=process.argv.indexOf('--source-manifest')
  const sourceManifest=manifestIndex<0?[]:JSON.parse(readFileSync(resolve(root,process.argv[manifestIndex+1]),'utf8')).sources.filter(s=>s.url).map(s=>s.url)
  const urls = [...new Set([...questions.map(q => q.content.source),...sourceManifest])]
  const failures = []
  const report=[]
  for (const url of urls) {
    try {
      let response
      for(let attempt=0;attempt<3;attempt++){
        response=await fetch(url,{signal:AbortSignal.timeout(20000)})
        await response.body?.cancel()
        if(response.status!==429 || attempt===2) break
        const raw=response.headers.get('retry-after')
        const delay=raw && /^\d+$/.test(raw)?Number(raw)*1000:raw?Date.parse(raw)-Date.now():15000
        if(delay>120000) break
        await new Promise(done=>setTimeout(done,Math.max(1000,delay||15000)))
      }
      report.push({url,status:response.status,finalUrl:response.url,checkedAt:new Date().toISOString()})
      if (!response.ok || new URL(response.url).protocol !== 'https:') failures.push(url+' '+response.status)
    } catch (error) { failures.push(url+' '+error.message);report.push({url,error:error.message,checkedAt:new Date().toISOString()}) }
  }
  mkdirSync(join(root,'.artifacts'),{recursive:true})
  writeFileSync(join(root,'.artifacts','content-sources.json'),JSON.stringify(report,null,2)+'\n')
  assert.deepEqual(failures, [], 'Broken or unreachable source URLs')
  console.log('PASS '+urls.length+' distinct HTTPS source links')
}

const coding = exercises.filter(x => x.kind === 'coding')
const sql = exercises.filter(x => x.kind === 'sql')
assert(coding.length >= 16 && sql.length >= 13)
for (const item of exercises) assert(item.version > 0 && item.testVersion > 0 && item.tests.length > 0)

const directory = join(root, '.artifacts', 'content')
mkdirSync(directory, { recursive: true })
const msSqlClient = JSON.parse(readFileSync(join(root, 'server', 'packages.lock.json'), 'utf8')).dependencies['net10.0']['Microsoft.Data.SqlClient'].resolved
writeFileSync(join(directory, 'ContentCheck.csproj'), [
  '<Project Sdk="Microsoft.NET.Sdk">',
  '  <PropertyGroup><TargetFramework>net10.0</TargetFramework><OutputType>Exe</OutputType><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup>',
  '  <ItemGroup><PackageReference Include="Microsoft.Data.SqlClient" Version="' + msSqlClient + '" /></ItemGroup>',
  '  <ItemGroup><FrameworkReference Include="Microsoft.AspNetCore.App" /></ItemGroup>',
  '</Project>',
].join('\n'))

const literal = text => JSON.stringify(text)
const long = value => literal(JSON.stringify(value))
const codingCalls = []
for (const { solution, examples, tests, slug } of coding) {
  const signature = solution.match(/public static \S+ (\w+)\(([^)]*)\)/)
  assert(signature, slug + ': Missing function signature')
  const types = signature[2].split(', ').map(param => param.split(' ')[0])
  for (const [index, test] of [...examples, ...tests].entries()) {
    const args = JSON.parse('[' + test.input + ']')
    assert.equal(args.length, types.length, slug)
    const expressions = args.map((value, arg) => 'JsonSerializer.Deserialize<' + types[arg] + '>(' + long(value) + ')!')
    codingCalls.push('CheckJson(' + literal(slug + ' #' + (index + 1)) + ', JsonSerializer.Serialize(Solutions.' +
      signature[1] + '(' + expressions.join(', ') + ')), ' + long(JSON.parse(test.output)) + ');')
  }
}

const sqlTypes = { ...sqlTypesV3,...sqlTypesV4, 'customer-orders': ['Int32', 'String', 'Int32'], 'department-salary': ['Int32', 'Int32', 'Decimal'],
  'daily-totals': ['Int32', 'DateTime', 'Int32'], 'latest-payment': ['Int32', 'Int32', 'Int32'],
  'unassigned-tickets': ['Int32', 'String'], 'product-sales': ['Int32', 'DateTime', 'Int32'],
  'above-team-average': ['Int32','Int32'], 'missing-sequence': ['Int32','Int32'], 'transfer-atomic': ['Int32','Int32'],
  'stock-threshold-crossings': ['Int32','Int32'], 'unbilled-work': ['Int32'],
  'course-vacancies': ['Int32','Int32'], 'learners-across-courses': ['Int32','Int32'] }
const sqlCalls = sql.map(item => {
  const [header, ...rows] = item.expected.split('\n').map(line => line.split('|').map(value => value.trim()))
  const query = ['SET NOCOUNT ON;', item.schema, item.dataset, item.solution].join('\n')
  return 'await CheckSql(' + [item.slug, query, JSON.stringify(header), JSON.stringify(sqlTypes[item.slug]), JSON.stringify(rows)]
    .map(literal).join(', ') + ', ' + String(item.ordered) + ');'
})
const previews = sql.map(item => {
  const tables = [...item.schema.matchAll(/CREATE\s+TABLE\s+(#\w+)\s*\(/gi)].map(m=>m[1])
  assert(tables.length && tables.length === new Set(tables).size, item.slug)
  return 'await Preview(' + [item.slug+'@'+item.version, item.schema+'\n'+item.dataset, JSON.stringify(tables)].map(literal).join(', ') + ');'
})
const sqlPredictions = newBatches.filter(q => q.content.technology === 'SQL Server 2022' && q.content.code)
const csPredictions = [...batch,...newBatches].filter(q => q.content.technology === '.NET 10' && q.content.code)
const declarationSnippets = csPredictions.filter(q=>/\b(class|record|struct|interface|enum)\s+\w/.test(q.content.code))
function expectedPrediction(q) {
  const expected = { 'integer-division': '0', 'closure-for': '333', 'linq-any-empty': '(False, True)' }[q.slug]
    ?? q.content.quiz?.en[q.content.quiz.correctIndex]
  assert.equal(typeof expected,'string',q.slug)
  return expected
}
if(declarationSnippets.length) {
  const project=join(root,'.artifacts','declaration-snippets')
  mkdirSync(project,{recursive:true})
  writeFileSync(join(project,'PredictionCheck.csproj'),'<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net10.0</TargetFramework><OutputType>Exe</OutputType><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>')
  for(const q of declarationSnippets) {
    writeFileSync(join(project,'Program.cs'),q.content.code)
    execFileSync('dotnet',['build',project,'--nologo','-v:q','-p:NuGetAudit=false'],{cwd:root})
    const actual=execFileSync('dotnet',[join(project,'bin','Debug','net10.0','PredictionCheck.dll')],{cwd:root,encoding:'utf8'}).trim()
    assert.equal(actual,expectedPrediction(q),q.slug)
  }
}

const harness = [
  'using System.Globalization;',
  'using System.Text.Json;',
  'using Microsoft.Data.SqlClient;',
  'var previews = new Dictionary<string, object>();',
  ...csPredictions.filter(q=>!declarationSnippets.includes(q)).map(q => {
    const expected = expectedPrediction(q)
    return '{ var consoleOutput = Console.Out; using var captured = new StringWriter(); Console.SetOut(captured); try {\n' +
      q.content.code + '\n} finally { Console.SetOut(consoleOutput); } Check(' + literal(q.slug) + ', captured.ToString().Trim(), ' + literal(expected) + '); }'
  }),
  ...codingCalls,
  ...sqlCalls,
  ...sqlPredictions.map(({slug,content:c}) => 'await CheckScalar(' + [slug,c.code,c.quiz.en[c.quiz.correctIndex]].map(literal).join(', ') + ');'),
  ...previews,
  'File.WriteAllText(' + literal(join(directory,'sql-preview.json')) + ', JsonSerializer.Serialize(previews, new JsonSerializerOptions { WriteIndented = true }));',
  'Console.WriteLine("Passed: ' + (codingCalls.length + sqlCalls.length + csPredictions.length + sqlPredictions.length) + ' executable checks, ' + questions.length + ' question records; Failed: 0, Skipped: 0");',
  'static void Check(string name, string actual, string expected)',
  '{',
  '    if (actual != expected) throw new Exception($"{name}: expected {expected}, got {actual}");',
  '}',
  'static void CheckJson(string name, string actual, string expected)',
  '{',
  '    if (!System.Text.Json.Nodes.JsonNode.DeepEquals(System.Text.Json.Nodes.JsonNode.Parse(actual), System.Text.Json.Nodes.JsonNode.Parse(expected)))',
  '        throw new Exception($"{name}: expected {expected}, got {actual}");',
  '}',
  'static async Task CheckScalar(string name, string sql, string expected)',
  '{',
  '    await using var db = new SqlConnection(ContentConnection());',
  '    await db.OpenAsync();',
  '    await using var query = new SqlCommand(sql, db) { CommandTimeout = 5 };',
  '    await using var reader = await query.ExecuteReaderAsync();',
  '    if (reader.FieldCount != 1 || !await reader.ReadAsync()) throw new Exception(name + " expected one value");',
  '    Check(name, Convert.ToString(reader[0], CultureInfo.InvariantCulture)!, expected);',
  '    if (await reader.ReadAsync() || await reader.NextResultAsync()) throw new Exception(name + " extra output");',
  '}',
  'static async Task CheckSql(string name, string sql, string names, string types, string expected, bool ordered)',
  '{',
  '    // Only the checked-in reference queries run against session-scoped temporary tables in tempdb.',
  '    await using var db = new SqlConnection(ContentConnection());',
  '    await db.OpenAsync();',
  '    await using var query = new SqlCommand(sql, db) { CommandTimeout = 5 };',
  '    await using var reader = await query.ExecuteReaderAsync();',
  '    var columns = Enumerable.Range(0, reader.FieldCount).ToArray();',
  '    Check(name + " columns", JsonSerializer.Serialize(columns.Select(reader.GetName)), names);',
  '    Check(name + " types", JsonSerializer.Serialize(columns.Select(column => reader.GetFieldType(column).Name)), types);',
  '    var rows = new List<string>();',
  '    while (await reader.ReadAsync())',
  '    {',
  '        var values = columns.Select(column => reader.GetValue(column) switch',
  '        {',
  '            DBNull => "NULL",',
  '            DateTime date when name == "daily-totals" || reader.GetDataTypeName(column) == "date" => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),',
  '            DateTime timestamp => timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffffff", CultureInfo.InvariantCulture),',
  '            decimal amount => amount.ToString("G29", CultureInfo.InvariantCulture),',
  '            IFormattable value => value.ToString(null, CultureInfo.InvariantCulture),',
  '            object value => value.ToString() ?? ""',
  '        });',
  '        rows.Add(string.Join(" | ", values));',
  '    }',
  '    var expectedTypes = JsonSerializer.Deserialize<string[]>(types)!;',
  '    var expectedRows = JsonSerializer.Deserialize<string[][]>(expected)!.Select(row => string.Join(" | ", row.Select((value,i) =>',
  '        expectedTypes[i] == "Decimal" && value != "NULL" ? decimal.Parse(value,CultureInfo.InvariantCulture).ToString("G29",CultureInfo.InvariantCulture) : value))).ToArray();',
  '    if (!ordered) { rows.Sort(StringComparer.Ordinal); Array.Sort(expectedRows, StringComparer.Ordinal); }',
  '    Check(name + " rows", string.Join("\\n", rows), string.Join("\\n", expectedRows));',
  '}',
  'async Task Preview(string key, string seed, string tableNames)',
  '{',
  '    await using var db = new SqlConnection(ContentConnection());',
  '    await db.OpenAsync();',
  '    await using (var command = new SqlCommand(seed, db)) await command.ExecuteNonQueryAsync();',
  '    var tables = new List<object>();',
  '    foreach (var name in JsonSerializer.Deserialize<string[]>(tableNames)!) {',
  '        await using var query = new SqlCommand("SELECT * FROM " + name, db);',
  '        await using var rows = await query.ExecuteReaderAsync();',
  '        var columns = Enumerable.Range(0, rows.FieldCount).ToArray();',
  '        var data = new List<string?[]>();',
  '        while (await rows.ReadAsync()) data.Add(columns.Select(i => rows.IsDBNull(i) ? null : rows.GetValue(i) is DateTime dt ? dt.ToString("O") : Convert.ToString(rows.GetValue(i), CultureInfo.InvariantCulture)).ToArray());',
  '        tables.Add(new { name, columns = columns.Select(i => new { name = rows.GetName(i), type = rows.GetDataTypeName(i) }).ToArray(), rows = data.OrderBy(r => JsonSerializer.Serialize(r), StringComparer.Ordinal).ToArray() });',
  '    }',
  '    previews.Add(key, tables);',
  '}',
  'static string ContentConnection() => new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("IP_CONTENT_SQL_CONNECTION")',
  '    ?? "Server=localhost;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;Connect Timeout=5;") { InitialCatalog = "tempdb" }.ConnectionString;',
  'public static class Solutions',
  '{',
  ...coding.map(item => item.solution.split('\n').map(line => '    ' + line).join('\n')),
  '}',
].join('\n')
writeFileSync(join(directory, 'Program.cs'), harness)
execFileSync('dotnet', ['run', '--project', directory, '-p:NuGetAudit=false'], { cwd: root, stdio: 'inherit' })
const previewFile = join(root, 'server', 'Content', 'sql-preview.json')
const verified = JSON.parse(readFileSync(join(directory,'sql-preview.json'),'utf8'))
if (process.env.IP_REFRESH_PREVIEW === '1') writeFileSync(previewFile, JSON.stringify(verified,null,2)+'\n')
else assert.deepEqual(data('sql-preview'),verified,'SQL table previews must match the versioned dataset')
