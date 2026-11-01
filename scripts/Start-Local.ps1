param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectDirectory
$appUrl = 'http://127.0.0.1:5173/'
& (Join-Path $PSScriptRoot 'Start-StructureApi.ps1')
try {
    $existingResponse = Invoke-WebRequest -Uri $appUrl -TimeoutSec 2 -UseBasicParsing
    if ($existingResponse.Content -notmatch 'content="hanzi-animation-notebook"') {
        throw '5173 連接埠已由其他程式使用，請先選擇其他連接埠。'
    }
    Write-Host "生字收藏本已在執行：$appUrl"
    if (-not $NoBrowser) { Start-Process $appUrl }
    exit 0
} catch {
    if ($_.Exception.Message -match '其他程式使用') { throw }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw '請先安裝 Node.js 22.12 以上版本。' }
if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'node_modules'))) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw '套件安裝失敗。' }
}
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw '建置失敗，請查看上方錯誤。' }
$runtimeDirectory = Join-Path $projectDirectory '.local'
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
$viteScript = Join-Path $projectDirectory 'node_modules\vite\bin\vite.js'
$previewProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('"' + $viteScript + '"', 'preview', '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $projectDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDirectory 'server.log') -RedirectStandardError (Join-Path $runtimeDirectory 'server-error.log')
$previewProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'server.pid')
$isReady = $false
for ($attempt = 0; $attempt -lt 25; $attempt++) {
    Start-Sleep -Milliseconds 200
    if ($previewProcess.HasExited) { throw '啟動失敗，請查看 .local/server-error.log。' }
    try {
        $response = Invoke-WebRequest -Uri $appUrl -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200 -and $response.Content -match 'content="hanzi-animation-notebook"') { $isReady = $true; break }
    } catch { }
}
if (-not $isReady) { throw '伺服器尚未就緒，請查看 .local/server-error.log。' }
Write-Host "生字收藏本已啟動：$appUrl （服務 PID $($previewProcess.Id)）"
if (-not $NoBrowser) { Start-Process $appUrl }
