# Agent 4: Cloud Sync via GitHub Gist

**Model:** qwen35-9b (fast, good for API integration)
**Priority:** MEDIUM - Prevents data loss

## Task Description
Sync projects database to GitHub Gist for cloud backup and cross-device sync.

## Requirements

### 1. Backend (Rust)
Create `src-tauri/src/commands/sync.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncConfig {
    pub gist_id: Option<String>,
    pub github_token: String, // Store in system keychain ideally
    pub auto_sync: bool,
    pub last_sync: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub gist_url: String,
    pub synced_at: u64,
    pub message: String,
}

/// Sync project database to Gist
#[tauri::command]
pub async fn sync_to_gist(
    config: SyncConfig,
    projects: Vec<ProjectRecord>
) -> Result<SyncResult, String> {
    // Create/update Gist with projects_db.json
    // Use GitHub API: POST /gists/{gist_id}
}

/// Load project database from Gist
#[tauri::command]
pub async fn sync_from_gist(
    config: SyncConfig
) -> Result<Vec<ProjectRecord>, String> {
    // Fetch Gist content
    // Parse and return projects
}

/// Get or create sync Gist
#[tauri::command]
pub async fn init_sync(config: SyncConfig) -> Result<String, String> {
    // Create new Gist if doesn't exist
    // Return gist_id
}

/// Test sync connection
#[tauri::command]
pub async fn test_sync(config: SyncConfig) -> Result<bool, String> {
    // Verify token and gist access
}
```

### 2. Frontend UI
Create `src/components/settings/SyncSettings.tsx`:
```typescript
interface SyncSettingsProps {
  config: SyncConfig;
  onConfigChange: (config: SyncConfig) => void;
  onSyncNow: () => Promise<void>;
  lastSyncTime: number | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}

// UI Components:
// - GitHub token input (with link to create token)
// - Gist ID display/input
// - "Connect to GitHub" button
// - "Sync Now" button
// - Auto-sync toggle
// - Last sync timestamp
// - Sync status indicator
```

### 3. Auto-Sync Hook
Create `src/hooks/useAutoSync.ts`:
```typescript
export function useAutoSync() {
  // Watch for project changes
  // Debounce and auto-sync after delay
  // Handle conflicts (local vs remote)
}
```

## Success Criteria
- ✅ Can connect GitHub account via token
- ✅ Can create/update Gist with projects data
- ✅ Can load projects from Gist
- ✅ Auto-sync toggle works
- ✅ Shows last sync time and status
- ✅ Handles conflicts gracefully

## Files to Modify
1. `src-tauri/src/commands/sync.rs` - New file
2. `src-tauri/src/main.rs` - Register commands
3. `src/components/settings/SyncSettings.tsx` - New file
4. `src/hooks/useAutoSync.ts` - New file
5. `src/types/index.ts` - Add SyncConfig, SyncResult
6. `src/lib/api.ts` - Add sync API functions
7. `src/App.tsx` - Add settings tab

## Security Notes
- Store GitHub token in Windows Credential Manager or keychain
- Never log tokens
- Use minimal scope: `gist` only
