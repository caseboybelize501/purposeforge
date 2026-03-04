# Agent 3: Git Branch & PR Workflow

**Model:** codestral-22b (excellent for git workflows and code review)
**Priority:** MEDIUM - Enables team collaboration

## Task Description
Add support for creating feature branches and pull requests instead of always pushing to main.

## Requirements

### 1. Backend (Rust)
Extend `src-tauri/src/commands/github.rs`:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Branch {
    pub name: String,
    pub is_current: bool,
    pub is_protected: bool,
    pub last_commit: Commit,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PullRequest {
    pub id: i64,
    pub number: i64,
    pub title: String,
    pub body: String,
    pub state: String, // "open" | "closed" | "merged"
    pub head: String,  // branch name
    pub base: String,  // target branch
    pub html_url: String,
    pub created_at: String,
}

/// Create a new branch
#[tauri::command]
pub async fn create_branch(
    repo_path: &str,
    branch_name: &str,
    base_branch: Option<&str>
) -> Result<(), String> {
    // git checkout -b <branch_name> [base_branch]
}

/// List all branches
#[tauri::command]
pub async fn list_branches(repo: &str) -> Result<Vec<Branch>, String> {
    // gh api repos/{owner}/{repo}/branches
}

/// Create a pull request
#[tauri::command]
pub async fn create_pull_request(
    repo: &str,
    title: &str,
    body: &str,
    head: &str,
    base: &str,
    draft: Option<bool>
) -> Result<PullRequest, String> {
    // gh pr create --title --body --head --base
}

/// List pull requests
#[tauri::command]
pub async fn list_pull_requests(
    repo: &str,
    state: Option<&str>
) -> Result<Vec<PullRequest>, String> {
    // gh pr list --state
}

/// Push current branch to remote
#[tauri::command]
pub async fn push_branch(
    repo_path: &str,
    set_upstream: Option<bool>
) -> Result<(), String> {
    // git push [origin [branch]]
}
```

### 2. Builder Panel Updates
Modify `src/components/builder/BuilderPanel.tsx`:
```typescript
// Add branch options before build
interface BuildOptions {
  createBranch: boolean;
  branchName: string;
  baseBranch: string;
  createPR: boolean;
  prTitle: string;
  prDescription: string;
  isDraft: boolean;
}
```

### 3. Repo Panel Updates
Extend `src/components/repo/RepoPanel.tsx`:
- Add "Branches" tab
- Show branch list with create/delete buttons
- Add "Pull Requests" tab (already exists, enhance it)
- Add branch switcher dropdown

## Success Criteria
- ✅ Can create feature branch before building
- ✅ Can create PR with title/description
- ✅ Can list and switch between branches
- ✅ Can view PR status (open/closed/merged)
- ✅ Default behavior still works (push to main)

## Files to Modify
1. `src-tauri/src/commands/github.rs` - Add branch/PR commands
2. `src-tauri/src/main.rs` - Register new commands
3. `src/components/builder/BuilderPanel.tsx` - Add branch options
4. `src/components/repo/RepoPanel.tsx` - Add branches tab
5. `src/types/index.ts` - Add Branch, PullRequest types
6. `src/lib/api.ts` - Add branch/PR API functions
