Write-Host ">>> Starting OpenManus Web Backend (FastAPI 2.0)..." -ForegroundColor Cyan
Set-Location -Path "D:\AI\OpenManus-Web\backend"

$venvPython = "D:\AI\OpenManus-Web\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] Virtual environment not found at: $venvPython" -ForegroundColor Red
    exit 1
}

# Check if port 8088 is occupied
$portCheck = Get-NetTCPConnection -LocalPort 8088 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "[WARN] Port 8088 is currently in use. Existing process may be active." -ForegroundColor Yellow
}

Write-Host ">>> Launching Uvicorn on http://localhost:8088..." -ForegroundColor Green
& $venvPython -m uvicorn omweb.main:app --host 0.0.0.0 --port 8088 --reload