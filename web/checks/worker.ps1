$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runDir = Join-Path $repo ('.artifacts\worker-qa-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDir | Out-Null
$env:IP_WORKER_STATE = $runDir
$env:IP_WORKER_TESTS = Join-Path $runDir 'private.json'
$env:IP_WORKER_TOKEN = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$env:IP_WORKER_CERT = Join-Path $runDir 'localhost.pem'
$env:IP_WORKER_KEY = Join-Path $runDir 'localhost-key.pem'
$env:IP_WORKER_PORT = '5099'
$env:Runner__Endpoint = 'https://127.0.0.1:5099'
$env:Runner__CaFile = $env:IP_WORKER_CERT
$env:Runner__Token = $env:IP_WORKER_TOKEN
$env:Runner__IsolationVerified = 'true'
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Ai__Provider = 'Disabled'
$env:ConnectionStrings__Practice = 'Server=localhost;Database=InterviewPractice_RunnerWeb_QA;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'
$worker = $null
$api = $null
Push-Location -LiteralPath $repo
try {
    node worker/prepare-tests.mjs $env:IP_WORKER_TESTS
    if($LASTEXITCODE -ne 0){ throw 'Test pack failed' }
    node worker/check.mjs --attest
    if($LASTEXITCODE -ne 0){ throw 'Worker isolation checks failed' }
    # Private one-day certificate trusted only by this QA API process.
    openssl req -x509 -newkey rsa:2048 -quiet -nodes -days 1 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' -keyout $env:IP_WORKER_KEY -out $env:IP_WORKER_CERT
    if($LASTEXITCODE -ne 0){ throw 'QA certificate failed' }
    $worker = Start-Process node -ArgumentList 'worker/service.mjs' -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $runDir 'worker.log')
    $out=Join-Path $runDir 'api'
    dotnet build server --no-restore -c Release -o $out -p:UseAppHost=false
    if($LASTEXITCODE -ne 0){ throw 'API build failed' }
    $api = Start-Process dotnet -ArgumentList @('"' + (Join-Path $out 'InterviewPractice.dll') + '"','--urls','http://127.0.0.1:5098') -WorkingDirectory (Join-Path $repo 'server') -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $runDir 'api-error.log') -RedirectStandardOutput (Join-Path $runDir 'api.log')
    $ready=$false
    for($i=0;$i -lt 60;$i++){
        if($api.HasExited -or $worker.HasExited){throw "QA process exited, see $runDir"}
        try{$ready=(Invoke-RestMethod 'http://127.0.0.1:5098/api/health/ready' -TimeoutSec 2).status -eq 'ready'}catch{}
        if($ready){break}
        Start-Sleep -Milliseconds 500
    }
    if(!$ready){throw 'QA readiness failed'}
    node web/checks/worker.mjs
    if($LASTEXITCODE -ne 0){throw 'Gateway browser check failed'}
}finally{
    foreach($process in @($api,$worker)){if($process -and !$process.HasExited){$process.Kill();$process.WaitForExit()}}
    foreach($file in @($env:IP_WORKER_KEY,$env:IP_WORKER_TESTS)){if(Test-Path -LiteralPath $file){Remove-Item -LiteralPath $file}}
    Pop-Location
}
