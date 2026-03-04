# Test Ollama chat API with different models
$testModels = @("qwen-coder-32b:latest", "nemotron-claude:latest", "codestral-22b:latest")

foreach ($model in $testModels) {
    Write-Host "========================================"
    Write-Host "Testing: $model"
    Write-Host "========================================"
    
    $body = @{
        model = $model
        messages = @(
            @{
                role = "system"
                content = "OUTPUT FORMAT: You MUST respond with ONLY a valid JSON array. NO explanations. NO markdown. NO code blocks. Format exactly: [{`"path`":`"filename`",`"content`":`"file content here`"}]"
            },
            @{
                role = "user"
                content = "Generate 2 files: main.py and README.md for hello world"
            }
        )
        stream = $false
        options = @{
            temperature = 0.1
        }
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri 'http://localhost:11434/api/chat' -Method Post -ContentType 'application/json' -Body $body
        $content = $response.message.content
        
        # Check if it starts with [
        if ($content.TrimStart().StartsWith("[")) {
            Write-Host "SUCCESS: Valid JSON format!" -ForegroundColor Green
            Write-Host $content.Substring(0, [Math]::Min(200, $content.Length))
        } else {
            Write-Host "FAIL: Not JSON format" -ForegroundColor Red
            Write-Host "First 200 chars:"
            Write-Host $content.Substring(0, [Math]::Min(200, $content.Length))
        }
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
    Write-Host ""
}
