using Microsoft.Data.SqlClient;
using System.Data;
using System.Globalization;
using System.Text;
using System.Text.Json;

using var input = JsonDocument.Parse(await Console.In.ReadToEndAsync());
string Read(string key) => input.RootElement.GetProperty(key).GetString()!;
var login = new SqlConnectionStringBuilder { DataSource="127.0.0.1,1433", UserID="sa",
    Password=Read("password"), InitialCatalog="master", TrustServerCertificate=true, Pooling=false, ConnectTimeout=2 };
using var startup = new CancellationTokenSource(TimeSpan.FromSeconds(40));
await using (var admin = new SqlConnection(login.ConnectionString))
{
    while (true)
    {
        try { await admin.OpenAsync(startup.Token); break; }
        catch (SqlException) when (!startup.IsCancellationRequested) { await Task.Delay(350, startup.Token); }
    }
    // A fresh login can use its own temp tables. Candidate queries never execute on the admin connection.
    login.UserID = "practice_candidate";
    login.Password = Guid.NewGuid().ToString("N")+"aZ7!";
    await using var provision = admin.CreateCommand();
    provision.CommandText = $"CREATE LOGIN [practice_candidate] WITH PASSWORD='{login.Password}', CHECK_POLICY=ON; DENY VIEW ANY DATABASE TO [practice_candidate]";
    await provision.ExecuteNonQueryAsync(startup.Token);
}
login.InitialCatalog = "tempdb";
await using var db = new SqlConnection(login.ConnectionString);
await db.OpenAsync();
try
{
    await using var query = db.CreateCommand();
    query.CommandTimeout = 4;
    query.CommandText = "SET NOCOUNT ON; SET LOCK_TIMEOUT 3000; " + Read("schema");
    await query.ExecuteNonQueryAsync();
    query.CommandText = Read("dataset");
    if (!string.IsNullOrWhiteSpace(query.CommandText)) await query.ExecuteNonQueryAsync();
    query.CommandText = Read("query");
    await using var reader = await query.ExecuteReaderAsync(CommandBehavior.SequentialAccess);
    if (reader.FieldCount is < 1 or > 100) throw new InvalidDataException();
    var ordinals=Enumerable.Range(0,reader.FieldCount).ToArray();
    var columns=ordinals.Select(reader.GetName).ToArray();
    var types=ordinals.Select(reader.GetDataTypeName).ToArray();
    if (columns.Any(c=>c.Length>256)) throw new InvalidDataException();
    var rows=new List<string?[]>();
    var bytes=0;
    var chars=new char[8193];
    var binary=new byte[4097];
    while (await reader.ReadAsync())
    {
        if (rows.Count>=1000) throw new InvalidDataException();
        var row=new string?[reader.FieldCount];
        foreach (var i in ordinals)
        {
            if (await reader.IsDBNullAsync(i)) continue;
            var type=reader.GetFieldType(i);
            string? value;
            if (type==typeof(string))
            {
                var length=(int)reader.GetChars(i,0,chars,0,chars.Length);
                if (length==chars.Length) throw new InvalidDataException();
                value=new string(chars,0,length);
            }
            else if(type==typeof(byte[]))
            {
                var length=(int)reader.GetBytes(i,0,binary,0,binary.Length);
                if(length==binary.Length) throw new InvalidDataException();
                value=Convert.ToHexString(binary,0,length);
            }
            else value=reader.GetValue(i) switch {
                decimal d => d.ToString("G29",CultureInfo.InvariantCulture),
                DateTime d => d.ToString("O",CultureInfo.InvariantCulture),
                DateTimeOffset d => d.ToString("O",CultureInfo.InvariantCulture),
                IFormattable f => f.ToString(null,CultureInfo.InvariantCulture),
                object v => v.ToString()
            };
            if (value?.Length>8192 || (bytes+=Encoding.UTF8.GetByteCount(value??"")+4)>65536) throw new InvalidDataException();
            row[i]=value;
        }
        rows.Add(row);
    }
    if (await reader.NextResultAsync()) throw new InvalidOperationException("Return exactly one result set.");
    Console.Write(JsonSerializer.Serialize(new {columns,types,rows}));
}
catch (SqlException e) { Console.Write(JsonSerializer.Serialize(new {error=e.Number == -2 ? "timeout":"runtime_error",message=e.Message[..Math.Min(1000,e.Message.Length)]})); }
catch (InvalidDataException) { Console.Write("{\"error\":\"output_limit\",\"message\":\"Result exceeds the output limit.\"}"); }
catch (InvalidOperationException e) { Console.Write(JsonSerializer.Serialize(new {error="runtime_error",message=e.Message})); }
