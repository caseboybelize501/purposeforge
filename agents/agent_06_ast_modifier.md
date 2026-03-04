# Agent 6: AST-Based File Modification

**Model:** nemotron-claude (excellent for code analysis and optimization)
**Priority:** HIGH - Safe code modifications without breaking syntax

## Task Description
Use tree-sitter for AST-based code parsing and safe modifications instead of string replacement.

## Requirements

### 1. Backend (Rust)
Create `src-tauri/src/commands/ast_modifier.rs`:

```rust
use tree_sitter::{Parser, Tree, Node, Query, QueryCursor};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ASTNode {
    pub kind: String,
    pub text: String,
    pub start_byte: usize,
    pub end_byte: usize,
    pub start_point: Point,
    pub end_point: Point,
    pub children: Vec<ASTNode>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Point {
    pub row: usize,
    pub column: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Modification {
    pub file: String,
    pub node_kind: String,      // e.g., "function_definition"
    pub node_name: Option<String>, // e.g., function name
    pub operation: String,       // "replace" | "insert_before" | "insert_after" | "delete"
    pub new_content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModificationResult {
    pub success: bool,
    pub file: String,
    pub modifications_applied: usize,
    pub diff: String,
}

/// Parse file into AST
#[tauri::command]
pub fn parse_file(path: &str, language: &str) -> Result<ASTNode, String> {
    // Detect language from extension or explicit param
    // Load tree-sitter language parser
    // Parse and return AST as JSON
}

/// Find nodes matching query
#[tauri::command]
pub fn find_nodes(
    path: &str,
    language: &str,
    query: &str
) -> Result<Vec<ASTNode>, String> {
    // Parse file
    // Run tree-sitter query
    // Return matching nodes
    // Example query: "(function_definition name: (identifier) @fn)"
}

/// Safely modify file using AST
#[tauri::command]
pub fn safe_modify_file(
    path: &str,
    modifications: Vec<Modification>
) -> Result<ModificationResult, String> {
    // Parse file
    // Apply each modification at AST level
    // Validate syntax after modification
    // Generate diff
    // Write if valid
}

/// Preview changes without applying
#[tauri::command]
pub fn preview_modification(
    path: &str,
    modifications: Vec<Modification>
) -> Result<String, String> {
    // Same as safe_modify_file but don't write
    // Return unified diff
}
```

### 2. Dependencies
Add to `src-tauri/Cargo.toml`:
```toml
[dependencies]
tree-sitter = "0.22"
tree-sitter-typescript = "0.21"
tree-sitter-rust = "0.21"
tree-sitter-python = "0.21"
tree-sitter-javascript = "0.21"
diff = "0.1"
```

### 3. Frontend UI
Create `src/components/builder/ASTEditor.tsx`:
```typescript
// Features:
// - AST tree viewer (collapsible nodes)
// - Click node to edit
// - Query builder for finding nodes
// - Diff preview before applying
// - Syntax validation status
```

## Success Criteria
- ✅ Can parse TypeScript/Rust/Python files into AST
- ✅ Can query AST for specific nodes
- ✅ Can modify nodes safely (no syntax errors)
- ✅ Shows diff preview before applying
- ✅ Validates syntax after modification
- ✅ Rolls back if validation fails

## Files to Modify
1. `src-tauri/src/commands/ast_modifier.rs` - New file
2. `src-tauri/Cargo.toml` - Add tree-sitter deps
3. `src-tauri/src/main.rs` - Register commands
4. `src/components/builder/ASTEditor.tsx` - New file
5. `src/types/index.ts` - Add AST types
6. `src/lib/api.ts` - Add AST API functions

## Safety Guarantees
- Never writes invalid syntax
- Always creates backup before modification
- Can rollback failed modifications
- Preserves formatting where possible
