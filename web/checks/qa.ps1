param([switch]$AiFixture, [switch]$Migration, [switch]$Upgrade, [switch]$OnlyUpgrade, [switch]$LiveGitHub)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serverDir = Join-Path $repo 'server'
$out = Join-Path $repo '.artifacts\qa-host'
$web = Join-Path $repo 'web'
$port = 5096
$env:IP_BASE = "http://127.0.0.1:$port"
$env:IP_BROWSER = 'chrome'
$env:IP_QA_DB = 'InterviewPractice_QA'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ConnectionStrings__Practice = 'Server=localhost;Database=InterviewPractice_QA;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'
$env:Admin__Email = 'qa-' + [guid]::NewGuid().ToString('N') + '@example.test'
$env:Admin__Password = [guid]::NewGuid().ToString() + 'Qa'
$env:IP_ADMIN_EMAIL = $env:Admin__Email
$env:IP_ADMIN_PASSWORD = $env:Admin__Password
$env:Ai__Provider = 'Disabled'
$env:Runner__IsolationVerified = 'false'
$env:IP_AI_FIXTURE = '0'
$env:IP_LIVE_GITHUB = if ($LiveGitHub) { '1' } else { '0' }
$api = $null
$provider = $null
try {
    dotnet build (Join-Path $serverDir 'InterviewPractice.csproj') --no-restore -c Release -o $out -p:UseAppHost=false
    if ($LASTEXITCODE -ne 0) { throw 'API build failed' }
    if ($AiFixture) {
        $env:Ai__Provider = 'OpenAI'
        $env:Ai__Endpoint = 'http://127.0.0.1:5095/v1/responses'
        $env:Ai__Model = 'fixture-structured-v1'
        $env:Ai__ApiKey = 'local-fixture'
        $env:IP_AI_FIXTURE = '1'
        $provider = Start-Process node -ArgumentList 'checks/provider.mjs' -WorkingDirectory $web -WindowStyle Hidden -PassThru
    }
    $api = Start-Process dotnet -ArgumentList @('"' + (Join-Path $out 'InterviewPractice.dll') + '"', '--urls', $env:IP_BASE) -WorkingDirectory $serverDir -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $out 'error.log') -RedirectStandardOutput (Join-Path $out 'host.log')
    $ready = $false
    for ($i=0; $i -lt 50; $i++) {
        if ($api.HasExited) { throw "QA API exited; see $out\error.log" }
        try { $ready = (Invoke-RestMethod "$env:IP_BASE/api/health" -TimeoutSec 2).status -eq 'ok' } catch { }
        if ($ready) { break }
        Start-Sleep -Milliseconds 400
    }
    if (!$ready) { throw 'QA API failed health check' }
    if ($Migration) {
        node (Join-Path $web 'checks/migration.mjs') after
        if ($LASTEXITCODE -ne 0) { throw 'Migration regression failed' }
    }
    if (!$OnlyUpgrade) {
        node (Join-Path $web 'checks/journey.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Journey regression failed' }
    }
    if ($Upgrade -or $OnlyUpgrade) {
        node (Join-Path $web 'checks/upgrade.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Upgrade regression failed' }
    }
} finally {
    if ($api -and !$api.HasExited) { $api.Kill(); $api.WaitForExit() }
    if ($provider -and !$provider.HasExited) { $provider.Kill(); $provider.WaitForExit() }
}
