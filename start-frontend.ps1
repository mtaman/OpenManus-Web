Write-Host ">>> Starting OpenManus Web Frontend (Next.js 15)..." -ForegroundColor Cyan
Set-Location -Path "D:\AI\OpenManus-Web\frontend"

# Free port 3088 linearly
Get-NetTCPConnection -LocalPort 3088 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Where-Object { $_ -gt 0 } |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

# Verify build artifacts
$manifest = "D:\AI\OpenManus-Web\frontend\.next\prerender-manifest.json"
if (-not (Test-Path $manifest)) {
    Write-Host ">>> Missing build artifacts. Running npm run build..." -ForegroundColor Yellow
    npm run build
}

Write-Host ">>> Launching Next.js on http://localhost:3088..." -ForegroundColor Green
npx next start -p 3088