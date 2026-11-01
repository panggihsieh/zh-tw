$ErrorActionPreference = 'Stop'
$apiProjectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
try {
    $apiHealth = Invoke-RestMethod 'http://127.0.0.1:5174/api/structure/settings' -TimeoutSec 2
    if ($apiHealth.service -eq 'hanzi-structure-api') { return }
    Write-Warning '5174 已由其他服務使用，AI 結構 API 未啟動。'
    return
} catch { }
$apiNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $apiNode) { Write-Warning '缺少 Node.js，AI 結構 API 未啟動。'; return }
$apiRuntimeDirectory = Join-Path $apiProjectDirectory '.local'
New-Item -ItemType Directory -Force -Path $apiRuntimeDirectory | Out-Null
$apiScriptPath = Join-Path $apiProjectDirectory 'server/structure-api.mjs'
$apiProcess = Start-Process -FilePath $apiNode.Source -ArgumentList @('"' + $apiScriptPath + '"') -WorkingDirectory $apiProjectDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $apiRuntimeDirectory 'structure-api.log') -RedirectStandardError (Join-Path $apiRuntimeDirectory 'structure-api-error.log')
$apiProcess.Id | Set-Content -LiteralPath (Join-Path $apiRuntimeDirectory 'structure-api.pid')
