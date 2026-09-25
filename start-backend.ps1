Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting OpenManus Web - Backend Server " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$backendDir = "D:\AI\OpenManus-Web\backend"
$venvPython = "$backendDir\.venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] Virtual environment not found at: $venvPython" -ForegroundColor Red
    Exit 1
}

Set-Location $backendDir

Write-Host "[INFO] Starting FastAPI server on port 8088..." -ForegroundColor Green
& $venvPython -m uvicorn omweb.main:app --host 127.0.0.1 --port 8088 --reload