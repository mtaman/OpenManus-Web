Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting OpenManus Web - Frontend Server" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$frontendDir = "D:\AI\OpenManus-Web\frontend"

if (-not (Test-Path $frontendDir)) {
    Write-Host "[ERROR] Frontend directory not found at: $frontendDir" -ForegroundColor Red
    Exit 1
}

Set-Location $frontendDir

Write-Host "[INFO] Starting Next.js frontend on port 3088..." -ForegroundColor Green
$env:PORT = "3088"
npm run dev -- -p 3088