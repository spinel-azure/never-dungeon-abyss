param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$repoPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$previewUrl = 'http://127.0.0.1:4173/tools/aurora-os-preview.html'
function Test-Preview {
    try {
        $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match 'AURORA OS.*local preview'
    } catch { return $false }
}
if (-not (Test-Preview)) {
    if (Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 4173 is already in use by another server. Close that server and try again.'
    }
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    $serverPath = Join-Path $PSScriptRoot 'dev-server.cjs'
    $server = Start-Process -FilePath $nodePath -ArgumentList @(('"{0}"' -f $serverPath), '4173') -WorkingDirectory $repoPath -WindowStyle Hidden -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (Test-Preview) { $ready = $true; break }
        if ($server.HasExited) { break }
        Start-Sleep -Milliseconds 200
    }
    if (-not $ready) { throw 'The local preview server could not start.' }
}
if (-not $NoBrowser) { Start-Process $previewUrl }
Write-Output $previewUrl
