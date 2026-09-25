Write-Host ">>> Starting OpenManus Web Frontend in FAST DEV MODE (Hot-Reload)..." -ForegroundColor Cyan
Set-Location -Path "D:\AI\OpenManus-Web\frontend"

# Free port 3088
Get-NetTCPConnection -LocalPort 3088 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Where-Object { $_ -gt 0 } |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Write-Host ">>> Launching Next.js Fast Dev on http://localhost:3088..." -ForegroundColor Green
npx next dev -p 3088