# Agent 2: Code Validation System

**Model:** qwen-coder-32b
**Priority:** HIGH - Prevents broken code from being committed

## Task Description
Add pre-commit validation that runs TypeScript compiler, Cargo check, or Python syntax check before allowing git commit.

## Requirements

### 1. Backend (Rust)
Create `src-tauri/src/commands/validator.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub success: bool,
    pub language: String,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationError {
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub message: String,
    pub severity: String, // "error" | "warning"
}

/// Validate TypeScript project
#[tauri::command]
pub fn validate_typescript(project_path: &str) -> Result<ValidationResult, String> {
    // Run: npx tsc --noEmit
    // Parse output for errors/warnings
}

/// Validate Rust project
#[tauri::command]
pub fn validate_rust(project_path: &str) -> Result<ValidationResult, String> {
    // Run: cargo check --message-format=json
    // Parse JSON output
}

/// Validate Python project
#[tauri::command]
pub fn validate_python(project_path: &str) -> Result<ValidationResult, String> {
    // Run: python -m py_compile <files>
    // Or: ruff check .
}

/// Run validation for detected language
#[tauri::command]
pub fn run_validation(
    project_path: &str,
    language: Option<String>
) -> Result<ValidationResult, String> {
    // Auto-detect language if not specified
    // Run appropriate validator
}
```

### 2. Integration with Builder
Modify `src-tauri/src/commands/builder.rs`:
```rust
// In build_and_push_project, before git commit:
let validation = run_validation(&project_dir, None).await?;
if !validation.success {
    return Ok(BuildResult {
        success: false,
        message: format!("Validation failed: {} errors", validation.errors.len()),
        // ...
    });
}
```

### 3. Frontend UI
Create `src/components/builder/ValidationPanel.tsx`:
- Show validation status in real-time
- Display errors with file links
- "Fix with AI" button for each error
- Toggle: "Skip validation" (with warning)

## Success Criteria
- ✅ TypeScript errors caught before commit
- ✅ Rust compilation errors caught before commit
- ✅ Python syntax errors caught before commit
- ✅ Validation results displayed clearly in UI
- ✅ Option to fix with AI or skip validation

## Files to Modify
1. `src-tauri/src/commands/validator.rs` - New file
2. `src-tauri/src/main.rs` - Register commands
3. `src-tauri/src/commands/builder.rs` - Add validation step
4. `src/components/builder/BuilderPanel.tsx` - Add validation UI
5. `src/types/index.ts` - Add ValidationResult type
6. `src/lib/api.ts` - Add validation API
