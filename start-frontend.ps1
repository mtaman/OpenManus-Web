Write-Host ">>> Starting OpenManus Web Frontend (Next.js 15)..." -ForegroundColor Cyan
Set-Location -Path "D:\AI\OpenManus-Web\frontend"

# Check if port 3088 is occupied
$portCheck = Get-NetTCPConnection -LocalPort 3088 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "[WARN] Port 3088 is currently in use. Existing process may be active." -ForegroundColor Yellow
}

Write-Host ">>> Launching Next.js on http://localhost:3088..." -ForegroundColor Green
npm run start -- -p 3088