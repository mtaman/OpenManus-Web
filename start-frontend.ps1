# =============================================================================
# OpenManus Web Dashboard - Frontend Startup Script
# =============================================================================
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent$MyInvocation.MyCommand.Path
$FrontendDir = Join-Path$RootDir "frontend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting OpenManus Web Frontend (:3088)..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location $FrontendDir

if (-not (Test-Path "node_modules")) {
    Write-Warning "node_modules directory not detected."
    Write-Host "Installing frontend dependencies with pnpm..." -ForegroundColor Yellow
    pnpm install
}

Write-Host "Launching Next.js development server on http://localhost:3088..." -ForegroundColor Green
pnpm dev --port 3088