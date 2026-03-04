# Agent 5: Dynamic Template System

**Model:** qwen-coder-32b
**Priority:** HIGH - Enables community templates and customization

## Task Description
Allow runtime template loading from files, URLs, or GitHub repos instead of hardcoded templates.

## Requirements

### 1. Backend (Rust)
Create `src-tauri/src/commands/templates.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateSource {
    pub id: String,
    pub name: String,
    pub source_type: String, // "file" | "url" | "github"
    pub location: String,    // path, URL, or repo
    pub last_loaded: u64,
}

/// Load template from JSON file
#[tauri::command]
pub fn load_template_from_file(path: &str) -> Result<ProjectTemplate, String> {
    // Read and parse JSON file
    // Validate structure
}

/// Load template from URL
#[tauri::command]
pub async fn load_template_from_url(url: &str) -> Result<ProjectTemplate, String> {
    // Fetch JSON from URL
    // Parse and validate
}

/// Load template from GitHub repo
#[tauri::command]
pub async fn load_template_from_github(
    owner: &str,
    repo: &str,
    path: Option<&str>
) -> Result<ProjectTemplate, String> {
    // Fetch from raw.githubusercontent.com
    // Parse template.json from repo
}

/// Save template to file
#[tauri::command]
pub fn save_template(
    template: &ProjectTemplate,
    path: &str
) -> Result<(), String> {
    // Serialize to JSON and write
}

/// List user templates
#[tauri::command]
pub fn list_user_templates() -> Result<Vec<ProjectTemplate>, String> {
    // Scan templates directory
    // Load all valid templates
}

/// Import template from marketplace
#[tauri::command]
pub async fn import_template(source: &str) -> Result<TemplateSource, String> {
    // Download and save template
    // Add to sources list
}
```

### 2. Template Format
Define standard template JSON schema:
```json
{
  "id": "custom-template",
  "name": "My Custom Template",
  "description": "Description here",
  "language": "TypeScript",
  "tags": ["web", "api"],
  "structure": [
    {
      "path": "src/index.ts",
      "content": "// Content here"
    }
  ],
  "dependencies": {
    "npm": ["express", "typescript"],
    "cargo": [],
    "pip": []
  }
}
```

### 3. Frontend UI
Create `src/components/templates/TemplateManager.tsx`:
```typescript
// Features:
// - List built-in templates
// - List user templates
// - Import template (file upload, URL, GitHub)
// - Export template
// - Create template editor
// - Delete/disable templates
// - Template preview
```

### 4. Template Marketplace
Create `src/components/templates/Marketplace.tsx`:
```typescript
// Browse community templates
// Search by tags/language
// One-click import
// Rating system (future)
```

## Success Criteria
- ✅ Can load template from JSON file
- ✅ Can load template from URL
- ✅ Can load template from GitHub repo
- ✅ Can save/export templates
- ✅ Template manager UI works
- ✅ Imported templates appear in builder
- ✅ Can create template from existing project

## Files to Modify
1. `src-tauri/src/commands/templates.rs` - New file
2. `src-tauri/src/main.rs` - Register commands
3. `src/components/templates/TemplateManager.tsx` - New file
4. `src/components/templates/Marketplace.tsx` - New file
5. `src/types/index.ts` - Add TemplateSource type
6. `src/lib/api.ts` - Add template API functions
7. `src/App.tsx` - Add templates tab
