# Agent 8: Integration & Testing Coordinator

**Model:** qwen35-35b (most powerful, best for complex integration)
**Priority:** CRITICAL - Ensures all improvements work together

## Task Description
Integrate all 7 previous improvements and create comprehensive test suite.

## Requirements

### 1. Integration Module
Create `src-tauri/src/commands/integration.rs`:

```rust
/// Full workflow test
#[tauri::command]
pub async fn test_full_workflow() -> Result<WorkflowTestResult, String> {
    // Test: Create project → Validate → Token check → Branch → Build → PR
    // Return detailed results
}

/// Health check for all systems
#[tauri::command]
pub async fn system_health_check() -> Result<HealthReport, String> {
    // Check: Ollama, GitHub auth, file system, network
    // Return status of each component
}
```

### 2. Test Suite
Create `src-tauri/tests/integration.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_token_counting() {
        // Test accurate token counting
        // Test validation at limits
    }
    
    #[tokio::test]
    async fn test_code_validation() {
        // Test TypeScript validation
        // Test Rust validation
        // Test Python validation
    }
    
    #[tokio::test]
    async fn test_branch_creation() {
        // Test creating branches
        // Test PR creation
    }
    
    #[tokio::test]
    async fn test_template_loading() {
        // Test file loading
        // Test URL loading
        // Test GitHub loading
    }
    
    #[tokio::test]
    async fn test_ast_modification() {
        // Test parsing
        // Test safe modification
        // Test rollback
    }
    
    #[tokio::test]
    async fn test_error_recovery() {
        // Test retry logic
        // Test checkpoint restore
    }
    
    #[tokio::test]
    async fn test_full_integration() {
        // End-to-end test of entire workflow
    }
}
```

### 3. CI/CD Workflow
Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
    
    - name: Install Node
      uses: actions/setup-node@v4
      with:
        node-version: 20
    
    - name: Install Ollama
      run: |
        curl -fsSL https://ollama.com/install.sh | sh
        ollama pull qwen-coder:32b
    
    - name: Run Rust tests
      run: cargo test --verbose
    
    - name: Run TypeScript checks
      run: npm run typecheck
    
    - name: Build Tauri app
      run: cargo tauri build
```

### 4. Test Fixtures
Create `src-tauri/tests/fixtures/`:
```
fixtures/
  valid-ts-project/
  valid-rust-project/
  invalid-ts-project/
  templates/
    test-template.json
  checkpoints/
    test-checkpoint.json
```

### 5. Integration Dashboard
Create `src/components/dev/IntegrationDashboard.tsx`:

```typescript
// Features:
// - Run all tests button
// - Test results display
// - System health status
// - Performance metrics
// - Error logs
// - Export test report
```

## Success Criteria
- ✅ All 7 improvements integrated without conflicts
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ CI/CD workflow runs on push
- ✅ No regressions in existing functionality
- ✅ Performance within acceptable limits (<5s for most operations)

## Files to Create
1. `src-tauri/src/commands/integration.rs` - New file
2. `src-tauri/tests/integration.rs` - New file
3. `src-tauri/tests/fixtures/*` - Test fixtures
4. `.github/workflows/test.yml` - CI/CD config
5. `src/components/dev/IntegrationDashboard.tsx` - New file
6. `CONTRIBUTING.md` - Developer guide
7. `CHANGELOG.md` - Version history

## Files to Modify
1. `src-tauri/src/main.rs` - Register integration commands
2. `src-tauri/Cargo.toml` - Add test dependencies
3. `package.json` - Add test scripts
4. `README.md` - Update with new features
