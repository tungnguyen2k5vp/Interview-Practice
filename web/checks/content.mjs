import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const data = name => JSON.parse(readFileSync(join(root, 'server', 'Content', name + '.json'), 'utf8'))
const questions = data('questions')
const exercises = data('exercises')
assert.equal(questions.length, 44)
assert.equal(new Set(questions.map(x => x.slug)).size, questions.length)
assert.equal(new Set(questions.map(x => x.content.topic)).size, 8)
for (const { content } of questions) {
  assert.equal(content.rubric.length, 4)
  assert(content.englishPrompt && content.englishFollowUp && content.hint)
  assert.equal(new URL(content.source).protocol, 'https:')
}

const coding = exercises.filter(x => x.kind === 'coding')
const sql = exercises.filter(x => x.kind === 'sql')
assert.equal(coding.length, 6)
assert.equal(sql.length, 6)
for (const item of exercises) assert(item.version > 0 && item.testVersion > 0 && item.tests.length > 0)

const directory = join(root, '.artifacts', 'content')
mkdirSync(directory, { recursive: true })
const msSqlClient = JSON.parse(readFileSync(join(root, 'server', 'packages.lock.json'), 'utf8')).dependencies['net10.0']['Microsoft.Data.SqlClient'].resolved
writeFileSync(join(directory, 'ContentCheck.csproj'), [
  '<Project Sdk="Microsoft.NET.Sdk">',
  '  <PropertyGroup><TargetFramework>net10.0</TargetFramework><OutputType>Exe</OutputType><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup>',
  '  <ItemGroup><PackageReference Include="Microsoft.Data.SqlClient" Version="' + msSqlClient + '" /></ItemGroup>',
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
    codingCalls.push('Check(' + literal(slug + ' #' + (index + 1)) + ', JsonSerializer.Serialize(Solutions.' +
      signature[1] + '(' + expressions.join(', ') + ')), ' + long(JSON.parse(test.output)) + ');')
  }
}

const sqlTypes = { 'customer-orders': ['Int32', 'String', 'Int32'], 'department-salary': ['Int32', 'Int32', 'Decimal'],
  'daily-totals': ['Int32', 'DateTime', 'Int32'], 'latest-payment': ['Int32', 'Int32', 'Int32'],
  'unassigned-tickets': ['Int32', 'String'], 'product-sales': ['Int32', 'DateTime', 'Int32'] }
const sqlCalls = sql.map(item => {
  const [header, ...rows] = item.expected.split('\n').map(line => line.split('|').map(value => value.trim()))
  const query = ['SET NOCOUNT ON;', item.schema, item.dataset, item.solution].join('\n')
  return 'await CheckSql(' + [item.slug, query, JSON.stringify(header), JSON.stringify(sqlTypes[item.slug]), JSON.stringify(rows)]
    .map(literal).join(', ') + ', ' + String(item.ordered) + ');'
})

const harness = [
  'using System.Globalization;',
  'using System.Text.Json;',
  'using Microsoft.Data.SqlClient;',
  ...codingCalls,
  ...sqlCalls,
  'Console.WriteLine("Passed: ' + (codingCalls.length + sqlCalls.length) + ', Failed: 0, Skipped: 0");',
  'static void Check(string name, string actual, string expected)',
  '{',
  '    if (actual != expected) throw new Exception($"{name}: expected {expected}, got {actual}");',
  '}',
  'static async Task CheckSql(string name, string sql, string names, string types, string expected, bool ordered)',
  '{',
  '    // Only the checked-in reference queries run against session-scoped temporary tables in tempdb.',
  '    const string connection = "Server=localhost;Database=tempdb;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;Connect Timeout=5;";',
  '    await using var db = new SqlConnection(connection);',
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
  '            DateTime date when name == "daily-totals" => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),',
  '            DateTime timestamp => timestamp.ToString("yyyy-MM-ddTHH:mm:ss.fffffff", CultureInfo.InvariantCulture),',
  '            decimal amount => amount.ToString("F2", CultureInfo.InvariantCulture),',
  '            IFormattable value => value.ToString(null, CultureInfo.InvariantCulture),',
  '            object value => value.ToString() ?? ""',
  '        });',
  '        rows.Add(string.Join(" | ", values));',
  '    }',
  '    var expectedRows = JsonSerializer.Deserialize<string[][]>(expected)!.Select(row => string.Join(" | ", row)).ToArray();',
  '    if (!ordered) { rows.Sort(StringComparer.Ordinal); Array.Sort(expectedRows, StringComparer.Ordinal); }',
  '    Check(name + " rows", string.Join("\\n", rows), string.Join("\\n", expectedRows));',
  '}',
  'public static class Solutions',
  '{',
  ...coding.map(item => item.solution.split('\n').map(line => '    ' + line).join('\n')),
  '}',
].join('\n')
writeFileSync(join(directory, 'Program.cs'), harness)
execFileSync('dotnet', ['run', '--project', directory, '-p:NuGetAudit=false'], { cwd: root, stdio: 'inherit' })
