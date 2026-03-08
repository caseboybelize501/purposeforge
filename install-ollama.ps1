# Ollama Installation and Configuration Script
# This script installs Ollama and configures custom model paths

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ollama Installation & Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Ollama is already installed
$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
$systemOllama = "C:\Program Files\Ollama\ollama.exe"

if (Test-Path $ollamaPath) {
    Write-Host "Ollama found at: $ollamaPath" -ForegroundColor Green
    $installedOllama = $ollamaPath
} elseif (Test-Path $systemOllama) {
    Write-Host "Ollama found at: $systemOllama" -ForegroundColor Green
    $installedOllama = $systemOllama
} else {
    Write-Host "Ollama not found. Downloading installer..." -ForegroundColor Yellow
    
    # Download Ollama installer
    $installerUrl = "https://ollama.com/download/OllamaSetup.exe"
    $installerPath = "$env:TEMP\OllamaSetup.exe"
    
    try {
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
        Write-Host "Download complete. Installing..." -ForegroundColor Yellow
        
        # Run installer silently
        Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait
        Write-Host "Installation complete!" -ForegroundColor Green
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        $installedOllama = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
        if (-not (Test-Path $installedOllama)) {
            $installedOllama = "C:\Program Files\Ollama\ollama.exe"
        }
    } catch {
        Write-Host "Installation failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Verify Ollama is working
Write-Host "`nVerifying Ollama installation..." -ForegroundColor Cyan
try {
    $version = & $installedOllama --version
    Write-Host "Ollama version: $version" -ForegroundColor Green
} catch {
    Write-Host "Failed to verify Ollama: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:"
Write-Host "1. Run 'setup-ollama-models.bat <model-name>' to configure a model"
Write-Host "2. Start Ollama serve (if not running): ollama serve"
Write-Host "3. Test with: .\test_ollama.ps1"
