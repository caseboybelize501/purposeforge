# Complete Ollama Setup Script
# This script installs Ollama and provides a menu for model configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete Ollama Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Run installation
& "$PSScriptRoot\install-ollama.ps1"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Available Models to Configure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$models = @(
    @{Name="qwen2.5-coder-7b"; Path="D:\models\qwen2.5-coder-7b.gguf"},
    @{Name="qwen3-coder-30b-q4"; Path="D:\models\qwen3-coder-30b-q4.gguf"},
    @{Name="qwen3-coder-30b"; Path="D:\models\qwen3-coder-30b.gguf"},
    @{Name="qwen2.5-coder-32b"; Path="D:\Users\CASE\models\qwen2.5-coder-32b.gguf"},
    @{Name="qwen3.5-9b"; Path="D:\Users\CASE\models\qwen3.5-9b.gguf"},
    @{Name="qwen3.5-27b"; Path="D:\Users\CASE\models\qwen3.5-27b.gguf"},
    @{Name="qwen3.5-35b"; Path="D:\Users\CASE\models\qwen3.5-35b.gguf"},
    @{Name="qwen3.5-35b-a3b"; Path="D:\Users\CASE\models\qwen3.5-35b-a3b.gguf"},
    @{Name="glm-4.7-flash"; Path="D:\Users\CASE\models\glm-4.7-flash.gguf"},
    @{Name="nemotron-30b"; Path="D:\Users\CASE\models\nemotron-3-nano-30b.gguf"},
    @{Name="mistral-7b"; Path="D:\AI\models\mistral-7b-instruct-v0.2.Q4_K_M.gguf"},
    @{Name="mistral-small-24b"; Path="D:\Users\CASE\AppData\Roaming\Block\goose\data\models\Mistral-Small-24B-Instruct-2501-Q4_K_M.gguf"},
    @{Name="qwen3-coder-30b-instruct-q8"; Path="D:\Users\CASE\AppData\Roaming\Block\goose\data\models\Qwen3-Coder-30B-A3B-Instruct-Q8_0.gguf"},
    @{Name="nomic-embed"; Path="D:\Users\CASE\.lmstudio\.internal\bundled-models\nomic-ai\nomic-embed-text-v1.5-GGUF\nomic-embed-text-v1.5.Q4_K_M.gguf"}
)

for ($i = 0; $i -lt $models.Count; $i++) {
    $exists = Test-Path $models[$i].Path
    $status = if ($exists) { "✓" } else { "✗" }
    $color = if ($exists) { "Green" } else { "Red" }
    Write-Host "  $status $($i+1). $($models[$i].Name)" -ForegroundColor $color
}

Write-Host "`n  0. Exit" -ForegroundColor Yellow
Write-Host "`nSelect model(s) to configure (comma-separated numbers, or 'all'):" -ForegroundColor Cyan

$selection = Read-Host "Enter selection"

if ($selection -eq "0") {
    Write-Host "Exiting..." -ForegroundColor Yellow
    exit 0
}

if ($selection -eq "all") {
    $toConfigure = 0..($models.Count - 1)
} else {
    $toConfigure = $selection -split ',' | ForEach-Object { [int]$_ - 1 }
}

Write-Host "`nConfiguring selected models..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($idx in $toConfigure) {
    if ($idx -ge 0 -and $idx -lt $models.Count) {
        $model = $models[$idx]
        
        if (Test-Path $model.Path) {
            Write-Host "`n[$($model.Name)]" -ForegroundColor Cyan
            & "$PSScriptRoot\setup-ollama-models.bat" $model.Name
        } else {
            Write-Host "`n[SKIP] $($model.Name) - File not found: $($model.Path)" -ForegroundColor Red
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nTo start Ollama server: ollama serve"
Write-Host "To list available models: ollama list"
Write-Host "To run a model: ollama run <model-name>"
