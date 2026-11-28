$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$runDir=Join-Path $repo ('.artifacts/v4-batch-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDir | Out-Null
$env:IP_BASE='http://127.0.0.1:5097'
$env:IP_BROWSER='chrome'
$env:IP_QA_DB='InterviewPractice_V4_Batch_QA_'+[guid]::NewGuid().ToString('N')
$env:ConnectionStrings__Practice='Server=localhost;Database='+$env:IP_QA_DB+';Integrated Security=True;Encrypt=True;TrustServerCertificate=True;'
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:Admin__Email='v4-'+[guid]::NewGuid().ToString('N')+'@example.test'
$env:Admin__Password=[guid]::NewGuid().ToString()+'Qa'
$env:IP_ADMIN_EMAIL=$env:Admin__Email
$env:IP_ADMIN_PASSWORD=$env:Admin__Password
$env:Ai__Provider='Disabled'
$env:Runner__IsolationVerified='false'
$api=$null
Push-Location -LiteralPath $repo
try {
    dotnet build server --no-restore -c Release -o $runDir -p:UseAppHost=false
    if($LASTEXITCODE -ne 0){throw 'Batch QA build failed'}
    $baseline=Join-Path $runDir 'baseline'
    $baselineContent=Join-Path $baseline 'Content'
    New-Item -ItemType Directory -Path $baselineContent | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $repo 'server/Content') -File | Where-Object { $_.Name -notmatch '^(questions|knowledge-checks)-batch-(20|21|22|23|24|25)(-|\.)' } | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $baselineContent
    }
    Copy-Item -LiteralPath (Join-Path $repo 'server/appsettings.json') -Destination $baseline
    Copy-Item -LiteralPath (Join-Path $repo 'server/appsettings.Development.json') -Destination $baseline
    Copy-Item -LiteralPath (Join-Path $repo 'server/wwwroot') -Destination $baseline -Recurse
    $api=Start-Process dotnet -ArgumentList @('"'+(Join-Path $runDir 'InterviewPractice.dll')+'"','--urls',$env:IP_BASE) -WorkingDirectory $baseline -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDir 'host.log') -RedirectStandardError (Join-Path $runDir 'error.log')
    $ready=$false
    for($i=0;$i -lt 60;$i++){
        try{$ready=(Invoke-RestMethod ($env:IP_BASE+'/api/health/ready') -TimeoutSec 2).status -eq 'ready'}catch{}
        if($ready -or $api.HasExited){break}
        Start-Sleep -Milliseconds 500
    }
    if(!$ready){throw "Batch QA startup failed; inspect $runDir"}
    node web/checks/content-batch.mjs server/Content
    if($LASTEXITCODE -ne 0){throw 'Batch import regression failed'}
}finally{
    if($api -and !$api.HasExited){$api.Kill();$api.WaitForExit()}
    Pop-Location
}
