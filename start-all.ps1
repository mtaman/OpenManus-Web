Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Launching OpenManus Web Dashboard (All)       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Start Backend in independent window
Start-Process powershell -ArgumentList "-NoExit", "-File", "D:\AI\OpenManus-Web\start-backend.ps1"

# Wait 2 seconds for backend initialization
Start-Sleep -Seconds 2

# Start Frontend in independent window
Start-Process powershell -ArgumentList "-NoExit", "-File", "D:\AI\OpenManus-Web\start-frontend.ps1"

Write-Host "`n>>> Both servers launched in background windows." -ForegroundColor Green
Write-Host ">>> Access Dashboard UI at: http://localhost:3088" -ForegroundColor Yellow