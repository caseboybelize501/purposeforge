# Ollama Setup - Complete

## Status: ✓ Installed and Running

**Ollama Version:** 0.17.7  
**Location:** `D:\Users\CASE\AppData\Local\Programs\Ollama\ollama.exe`  
**Server:** Running on `http://localhost:11434`

---

## Already Installed Models

| Model Name | Size | Quantization |
|------------|------|--------------|
| `qwen2.5-coder:32b` | 19.9 GB | Q4_K_M |
| `qwen3.5:35b-a3b` | 23.9 GB | Q4_K_M |
| `qwen3.5:9b` | 6.6 GB | Q4_K_M |
| `qwen3-coder:30b` | 18.6 GB | Q4_K_M |
| `glm-4.7-flash:q4_K_M` | 19.0 GB | Q4_K_M |
| `nemotron-3-nano:30b` | 24.3 GB | Q4_K_M |
| `qwen3.5:27b` | 17.4 GB | Q4_K_M |
| `qwen3.5:35b` | 23.9 GB | Q4_K_M |

---

## Quick Commands

### List all models
```cmd
setup-ollama-models.bat list
```
or
```cmd
ollama list
```

### Run a model
```cmd
setup-ollama-models.bat run qwen2.5-coder:32b
```
or
```cmd
ollama run qwen2.5-coder:32b
```

### Create model from GGUF file
```cmd
setup-ollama-models.bat create my-model D:\path\to\model.gguf
```

---

## API Usage

### PowerShell
```powershell
$body = @{
    model = "qwen2.5-coder:32b"
    messages = @(
        @{role = "user"; content = "Hello!"}
    )
    stream = $false
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri 'http://localhost:11434/api/chat' -Method Post -ContentType 'application/json' -Body $body
```

### Python
```python
import requests

response = requests.post('http://localhost:11434/api/chat', json={
    'model': 'qwen2.5-coder:32b',
    'messages': [{'role': 'user', 'content': 'Hello!'}],
    'stream': False
})
print(response.json())
```

### cURL
```cmd
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5-coder:32b",
  "messages": [{"role": "user", "content": "Hello!"}]
}'
```

---

## Note on Model Files

The paths you specified contain placeholder files (29 bytes each), not actual GGUF models. The models currently in Ollama were downloaded directly from the Ollama model hub.

To add new models from actual GGUF files, use:
```cmd
setup-ollama-models.bat create <model-name> <path-to-real-gguf-file>
```

---

## Management Commands

| Command | Description |
|---------|-------------|
| `ollama serve` | Start the Ollama server |
| `ollama list` | List all available models |
| `ollama run <model>` | Run a model interactively |
| `ollama pull <model>` | Download a model from Ollama hub |
| `ollama rm <model>` | Remove a model |
| `ollama show <model>` | Show model information |

---

## Files Created

| File | Purpose |
|------|---------|
| `install-ollama.ps1` | Install Ollama |
| `setup-ollama-models.bat` | Manage models (list/run/create) |
| `setup-ollama-complete.ps1` | Interactive setup menu |
| `Modelfile.*` | Model configuration files |
