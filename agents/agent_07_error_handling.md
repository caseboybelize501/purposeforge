# Agent 7: Error Handling & Retry Logic

**Model:** glm-4.7-flash (fast, good for structured error handling)
**Priority:** HIGH - Improves reliability and user experience

## Task Description
Implement comprehensive error handling with retry logic, rollback, and recovery mechanisms.

## Requirements

### 1. Backend (Rust)
Create `src-tauri/src/error.rs`:

```rust
use thiserror::Error;
use serde::{Deserialize, Serialize};

#[derive(Debug, Error)]
pub enum PurposeForgeError {
    #[error("Git operation failed: {0}")]
    GitError(GitError),
    
    #[error("GitHub API error: {0}")]
    GitHubApiError(GitHubApiError),
    
    #[error("AI generation failed: {0}")]
    AIError(AIError),
    
    #[error("File system error: {0}")]
    FileSystemError(FileSystemError),
    
    #[error("Validation failed: {0}")]
    ValidationError(ValidationError),
}

#[derive(Debug, Error, Serialize, Deserialize)]
pub struct GitError {
    pub operation: String,
    pub message: String,
    pub retryable: bool,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Error, Serialize, Deserialize)]
pub struct GitHubApiError {
    pub endpoint: String,
    pub status_code: u16,
    pub message: String,
    pub rate_limit_reset: Option<u64>,
    pub retryable: bool,
}

#[derive(Debug, Error, Serialize, Deserialize)]
pub struct AIError {
    pub model: String,
    pub message: String,
    pub fallback_models: Vec<String>,
    pub retryable: bool,
}

#[derive(Debug, Error, Serialize, Deserialize)]
pub struct FileSystemError {
    pub operation: String,
    pub path: String,
    pub message: String,
    pub rollback_available: bool,
}

#[derive(Debug, Error, Serialize, Deserialize)]
pub struct ValidationError {
    pub language: String,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Retry wrapper with exponential backoff
pub async fn retry_with_backoff<T, F, Fut>(
    operation: F,
    max_attempts: u32,
    base_delay_ms: u64,
) -> Result<T, PurposeForgeError>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, PurposeForgeError>>,
{
    let mut delay = base_delay_ms;
    let mut last_error = None;
    
    for attempt in 1..=max_attempts {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                if !is_retryable(&e) {
                    return Err(e);
                }
                last_error = Some(e);
                if attempt < max_attempts {
                    tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
                    delay *= 2; // Exponential backoff
                }
            }
        }
    }
    
    Err(last_error.unwrap())
}

/// Check if error is retryable
fn is_retryable(err: &PurposeForgeError) -> bool {
    match err {
        PurposeForgeError::GitError(e) => e.retryable,
        PurposeForgeError::GitHubApiError(e) => e.retryable,
        PurposeForgeError::AIError(e) => e.retryable,
        _ => false,
    }
}
```

### 2. Checkpoint System
Create `src-tauri/src/commands/checkpoint.rs`:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Checkpoint {
    pub id: String,
    pub timestamp: u64,
    pub operation: String,
    pub state: serde_json::Value,
    pub rollback_script: Option<String>,
}

/// Save checkpoint before risky operation
#[tauri::command]
pub fn save_checkpoint(
    operation: &str,
    state: serde_json::Value
) -> Result<String, String> {
    // Save to checkpoints directory
    // Return checkpoint ID
}

/// Restore from checkpoint
#[tauri::command]
pub fn restore_checkpoint(
    checkpoint_id: &str
) -> Result<(), String> {
    // Load checkpoint
    // Restore state
    // Execute rollback script if available
}

/// Get recent checkpoints
#[tauri::command]
pub fn list_checkpoints() -> Result<Vec<Checkpoint>, String> {
    // List available checkpoints
}
```

### 3. Frontend Error UI
Create `src/components/ui/ErrorRecovery.tsx`:

```typescript
interface ErrorRecoveryProps {
  error: PurposeForgeError;
  onRetry: () => void;
  onRollback: () => void;
  onUseFallback: () => void;
}

// Features:
// - Clear error message with suggestions
// - "Retry" button (if retryable)
// - "Rollback" button (if checkpoint exists)
// - "Use Fallback Model" button (for AI errors)
// - "Copy Error Details" button
// - Link to troubleshooting docs
```

## Success Criteria
- ✅ Network errors retry automatically (3 attempts, exponential backoff)
- ✅ Rate limits respected (wait until reset time)
- ✅ Checkpoints saved before risky operations
- ✅ Can rollback failed operations
- ✅ Clear error messages with actionable suggestions
- ✅ Fallback models tried if primary fails

## Files to Modify
1. `src-tauri/src/error.rs` - New file
2. `src-tauri/src/commands/checkpoint.rs` - New file
3. `src-tauri/Cargo.toml` - Add thiserror
4. `src-tauri/src/main.rs` - Register commands
5. `src/components/ui/ErrorRecovery.tsx` - New file
6. `src/types/index.ts` - Add error types
7. Update all commands to use new error types
