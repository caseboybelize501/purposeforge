# PurposeForge - AI-Powered Software Builder

A modular software builder desktop application powered by local AI models (Qwen, DeepSeek-R1) with GitHub integration.

## Features

- 🤖 **AI Chat**: Chat with Qwen Coder about your code, architecture, and project design
- 🏗️ **Project Builder**: Generate complete projects from templates or freeform descriptions
- 📦 **GitHub Integration**: Create repos, manage PRs, issues, and branches
- 🔍 **Code Validation**: Validate TypeScript, Rust, and Python code
- 🧠 **Project Memory**: Inject context from past projects for better AI responses
- ⚡ **Live Streaming**: Real-time token streaming from AI responses

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Tauri 2.0 (Rust)
- **AI Engine**: Ollama (Qwen3-Coder, DeepSeek-R1, Qwen2.5)
- **GitHub CLI**: Native GitHub integration

## Prerequisites

### 1. Install Ollama (AI Model Runner)

Download from [ollama.com](https://ollama.com) or run:

```powershell
# Windows (PowerShell)
winget install Ollama.Ollama
```

### 2. Pull AI Models

```bash
# Best for code generation (recommended)
ollama pull qwen3-coder

# Alternative: DeepSeek-R1 for complex reasoning
ollama pull deepseek-r1:8b

# Fast responses for simple tasks
ollama pull qwen2.5:7b
```

### 3. Install GitHub CLI (Optional)

Download from [cli.github.com](https://cli.github.com) then authenticate:

```bash
gh auth login
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run tauri dev

# Build for production
npm run tauri build
```

## Architecture

### Backend (`src-tauri/src/`)

- `commands/qwen.rs` - AI model location, streaming generation, Ollama/LM Studio support
- `commands/builder.rs` - Project generation, templates, skills
- `commands/github.rs` - GitHub CLI integration
- `commands/validator.rs` - Code validation
- `main.rs` - Tauri command registration

### Frontend (`src/`)

- `hooks/useQwen.ts` - React hook for AI operations
- `components/builder/BuilderPanel.tsx` - Project builder UI
- `components/ai/AIPanel.tsx` - AI chat interface
- `lib/api.ts` - TypeScript bindings for Tauri commands

## Qwen AI Integration

The app uses local AI models via Ollama for all AI-powered features:

### Supported Models

| Model | Use Case | Speed | Memory |
|-------|----------|-------|--------|
| `qwen3-coder` | **Best for code** | Fast | ~6GB |
| `deepseek-r1:8b` | Complex reasoning | 3-8s | ~8GB |
| `qwen2.5:7b` | Fast JSON output | 1-3s | ~6GB |
| `llama3.2:3b` | Simple tasks | <1s | ~4GB |

### How It Works

1. **Model Detection**: App scans for Ollama, LM Studio, or local models
2. **Streaming**: Tokens stream in real-time via Tauri events (`qwen-token`)
3. **Context Injection**: Project files, README, and skillset are injected into prompts
4. **Error Recovery**: Automatic retry with error feedback for malformed JSON

### API Commands

```rust
// Rust (Tauri backend)
locate_qwen() -> QwenLocation
qwen_generate(location, prompt, system, project_path) -> String
```

```typescript
// TypeScript (Frontend)
import { locateQwen, qwenGenerate } from './lib/api';

const location = await locateQwen();
const response = await qwenGenerate(location, "Generate a React component");
```

## Project Structure

```
purposeforge/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── qwen.rs     # AI engine
│   │   │   ├── builder.rs  # Project generation
│   │   │   ├── github.rs   # GitHub integration
│   │   │   └── ...
│   │   ├── main.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── src/                    # React frontend
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── .purposeforge/          # Skill definitions
└── package.json
```

## Troubleshooting

### "Qwen not found" error

```bash
# Check if Ollama is running
ollama list

# Pull the model
ollama pull qwen3-coder

# Restart Ollama service
ollama serve
```

### "AI model did not return valid files"

This means the model returned invalid JSON. Try:

1. Use a different model (qwen3-coder is best for code)
2. Add more specific requirements
3. Enable skills for better structure
4. Retry - the system has automatic error recovery

### Slow responses

- First run: 15-30s (model loading)
- Subsequent: 3-8s (qwen3-coder)
- Use `qwen2.5:7b` for faster responses (1-3s)

## License

MIT
