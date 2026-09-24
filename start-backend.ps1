# =============================================================================
# OpenManus Web Dashboard - Backend Startup Script
# =============================================================================
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent$MyInvocation.MyCommand.Path
$BackendDir = Join-Path$RootDir "backend"
$VenvActivate = Join-Path$BackendDir ".venv\Scripts\Activate.ps1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting OpenManus Web Backend (:8088)..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location $BackendDir

if (-not (Test-Path $VenvActivate)) {
    Write-Warning "Virtual environment not detected at backend\.venv."
    Write-Host "Initializing Python virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    & $VenvActivate
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    pip install -r requirements-openmanus.txt
    pip install -r requirements-web.txt
} else {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & $VenvActivate
}

Write-Host "Launching Uvicorn server on [http://127.0.0.1:8088](http://127.0.0.1:8088)..." -ForegroundColor Green
uvicorn omweb.main:app --host 127.0.0.1 --port 8088 --reload