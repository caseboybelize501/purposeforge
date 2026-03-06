# PurposeForge - Core Purpose Guide

## The One Thing That Matters

**PurposeForge is a GUI-based code generator that:**
1. **Generates build files** for Tauri projects using AI (Qwen/DeepSeek via Ollama)
2. **Exports to GitHub** automatically (repo creation + push)

**That's it.** Everything else is secondary.

---

## How It Works (Simplified Flow)

```
User Input (GUI)
    ↓
AI Model (Ollama: qwen3-coder, deepseek-r1, etc.)
    ↓
Generates JSON array of {path, content} files
    ↓
Rust Backend writes files to disk
    ↓
Initializes Git repo
    ↓
Creates GitHub repo (via gh CLI)
    ↓
Pushes to GitHub
```

---

## Key Components

### Frontend (`src/`)
| File | Purpose |
|------|---------|
| `components/builder/BuilderPanel.tsx` | Main UI for project generation |
| `components/ai/AIPanel.tsx` | Chat with AI about code |
| `hooks/useQwen.ts` | AI streaming hook |
| `lib/api.ts` | Tauri command bindings |

### Backend (`src-tauri/src/`)
| File | Purpose |
|------|---------|
| `commands/builder.rs` | **Core**: Writes files, git init, GitHub push |
| `commands/qwen.rs` | AI model detection + streaming generation |
| `commands/github.rs` | GitHub CLI integration |
| `main.rs` | Command registration |

---

## Data Flow

1. **User** enters project description in BuilderPanel
2. **AI** generates file array as JSON
3. **Rust** parses JSON → writes files → git init → gh repo create → git push
4. **Result**: GitHub repo URL shown in UI

---

## Critical Code Paths

### File Generation (Frontend)
```typescript
// src/components/builder/BuilderPanel.tsx
const raw = await generate(prompt, SYSTEM_PROMPT, token => stream...);
const files = parseFilesFromResponse(raw); // Parse JSON array
```

### Build & Push (Backend)
```rust
// src-tauri/src/commands/builder.rs
pub async fn build_and_push_project(req: BuildProjectRequest) -> Result<BuildResult> {
    // 1. Write files to disk
    // 2. git init
    // 3. gh repo create
    // 4. git push
}
```

---

## AI Integration

- **Models**: qwen3-coder (best for code), deepseek-r1:8b (reasoning), qwen2.5:7b (fast)
- **Location**: Ollama (local) or LM Studio
- **Streaming**: Tokens stream via Tauri events (`qwen-token`)
- **Output Format**: Strict JSON array of `{path, content}` objects

---

## GitHub Integration

- Uses `gh` CLI (not API)
- Commands: `gh auth login`, `gh repo create`, `gh pr create`, etc.
- Auth: System-level gh auth

---

## Project Templates

Built-in templates in `builder.rs`:
- React + TypeScript
- Python CLI
- Tauri App
- FastAPI REST API
- Rust Library
- Node.js + Express

---

## Skills System

Loadable "skills" that inject additional prompts:
- 10x Engineer Mode
- Premium UI/UX
- Senior Rustacean
- Strict TypeScript
- Security Auditor

---

## For the Next AI

**If you're modifying/extending this project:**

1. **Core function**: `build_and_push_project()` in `builder.rs`
2. **AI generation**: `qwen_generate()` in `qwen.rs`
3. **Frontend entry**: `BuilderPanel.tsx`
4. **Output format**: JSON array `[{path, content}]`
5. **GitHub flow**: git init → gh repo create → git remote add → git push

**DO NOT** overcomplicate. The system is:
- AI generates files
- Rust writes them
- Git/GitHub exports

Everything else (chat, skills, memory, validation) is **enhancement**, not core.

---

## Quick Commands

```bash
# Dev
npm install
cargo tauri dev

# Build
npm run tauri build

# AI Models
ollama pull qwen3-coder
ollama pull deepseek-r1:8b

# GitHub
gh auth login
```

---

## File Structure

```
purposeforge/
├── src/                      # React frontend
│   ├── components/builder/   # BuilderPanel.tsx (MAIN UI)
│   ├── components/ai/        # AIPanel.tsx
│   ├── hooks/                # useQwen.ts
│   └── lib/                  # api.ts (Tauri bindings)
├── src-tauri/                # Rust backend
│   └── src/commands/
│       ├── builder.rs        # CORE: File writing + GitHub push
│       ├── qwen.rs           # AI generation
│       └── github.rs         # GitHub CLI
└── .purposeforge/            # Skills definitions
```

---

**Remember**: This is a **code generator → GitHub exporter**. Nothing else matters as much.
