# Agent 1: Token Counter & Validator

**Model:** qwen-coder-32b (excellent for code generation)
**Priority:** HIGH - Prevents context overflow issues

## Task Description
Implement token counting for AI prompts to prevent exceeding Qwen's context window (32K tokens).

## Requirements

### 1. Backend (Rust)
Create `src-tauri/src/commands/token_counter.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenCount {
    pub count: usize,
    pub max_allowed: usize,
    pub remaining: usize,
    pub is_safe: bool,
}

/// Count tokens in text using tiktoken-rs
#[tauri::command]
pub fn count_tokens(text: &str) -> Result<TokenCount, String> {
    // Use tiktoken-rs with cl100k_base encoding (works for most models)
    // Return count with safety margins
}

/// Validate prompt size before sending to AI
#[tauri::command]
pub fn validate_prompt_size(
    prompt: &str,
    system: Option<&str>,
    context: Option<&str>,
    max_tokens: Option<usize>
) -> Result<TokenCount, String> {
    // Count all components
    // Return error if exceeds limit with suggestions
}

/// Estimate conversation size with message history
#[tauri::command]
pub fn estimate_conversation_size(
    messages: Vec<Message>,
    new_prompt: &str
) -> Result<TokenCount, String> {
    // Sum all message tokens
    // Include safety margin for response
}
```

### 2. Dependencies
Add to `src-tauri/Cargo.toml`:
```toml
[dependencies]
tiktoken-rs = "0.5"
```

### 3. Frontend Integration
Update `src/components/builder/BuilderPanel.tsx`:
- Add token counter display
- Show warning when approaching limit
- Auto-truncate or suggest simplification

### 4. API Wrapper
Add to `src/lib/api.ts`:
```typescript
export const countTokens = (text: string) =>
  invoke<TokenCount>('count_tokens', { text });

export const validatePromptSize = (
  prompt: string,
  system?: string,
  context?: string
) => invoke<TokenCount>('validate_prompt_size', { 
  prompt, 
  system: system ?? null,
  context: context ?? null 
});
```

## Success Criteria
- ✅ Accurate token counting within 5% of actual API usage
- ✅ Warning shown at 80% of context limit
- ✅ Block generation at 95% of context limit
- ✅ Suggest which parts to trim (context, system prompt, or user prompt)

## Files to Modify
1. `src-tauri/Cargo.toml` - Add tiktoken-rs
2. `src-tauri/src/commands/token_counter.rs` - New file
3. `src-tauri/src/main.rs` - Register commands
4. `src/lib/api.ts` - Add API wrappers
5. `src/components/builder/BuilderPanel.tsx` - Add UI
6. `src/types/index.ts` - Add TokenCount type

## Execution Command
```bash
python agents/agent_orchestrator.py --task 1
```
