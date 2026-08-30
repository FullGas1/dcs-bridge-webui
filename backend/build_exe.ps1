# build_exe.ps1 - builds the frontend, then packages backend + frontend into one exe (ticket 08).
# Usage: powershell -ExecutionPolicy Bypass -File backend\build_exe.ps1
# Output: backend\dist\dcs-bridge-webui.exe

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$frontend  = Join-Path $repoRoot "frontend"
$venvDir   = Join-Path $scriptDir "venv"
$venvPy    = Join-Path $venvDir "Scripts\python.exe"

Write-Host "Building frontend..."
Push-Location $frontend
try {
    npm install
    npm run build
} finally {
    Pop-Location
}

if (-not (Test-Path $venvPy)) {
    Write-Host "No venv found at $venvDir - creating one..."
    python -m venv $venvDir
    Write-Host "Installing runtime dependencies into the new venv..."
    & $venvPy -m pip install -r (Join-Path $scriptDir "requirements.txt") --quiet
}

Write-Host "Installing PyInstaller into the backend venv..."
& $venvPy -m pip install -r (Join-Path $scriptDir "requirements-build.txt") --quiet

Write-Host "Building the exe..."
Push-Location $scriptDir
try {
    & $venvPy -m PyInstaller `
        --onefile --console --name dcs-bridge-webui `
        --add-data "..\frontend\dist;frontend_dist" `
        launcher.py
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "OK - backend\dist\dcs-bridge-webui.exe"
