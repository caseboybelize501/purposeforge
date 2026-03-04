# PurposeForge Agent Safety Protocol

## Core Principle: **FIRST, DO NO HARM**

Every agent must follow this protocol to ensure codebase stability and prevent breaking changes.

---

## 🛡️ Safety Architecture

### 1. Checkpoint System (Automatic)
Before ANY file modification:
```
1. Create checkpoint with timestamp ID
2. Backup ALL target files (even if they don't exist yet)
3. Save to agents/checkpoints/{checkpoint_id}/
4. Track file hashes for verification
```

### 2. Test After EVERY File (Mandatory)
After writing EACH file:
```
1. Run language-specific validation:
   - Rust: cargo check
   - TypeScript: npm run build OR tsc --noEmit
   - Python: python -m py_compile
2. If test fails → IMMEDIATE ROLLBACK
3. If test passes → Continue to next file
```

### 3. Auto-Revert Protocol (Default ON)
When ANY test fails:
```
1. Stop immediately
2. Restore ALL files from checkpoint
3. Delete new files that didn't exist before
4. Log failure with detailed error output
5. Report to team with:
   - What failed
   - Why it failed
   - Suggested next steps
```

### 4. Team Alignment (Required Before Retry)
After a rollback:
```
1. Create incident report in agents/logs/
2. Tag relevant team members
3. Wait for approval before retrying
4. Retry with modified approach only after review
```

---

## 📋 Agent Execution Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    START AGENT TASK                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Create Checkpoint                                  │
│  - Generate checkpoint_{timestamp} ID                       │
│  - Backup all output_files                                  │
│  - Save to agents/checkpoints/{id}/                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Generate Code with AI                              │
│  - Load input_files                                         │
│  - Build prompt with context                                │
│  - Call Ollama model                                        │
│  - Parse JSON response                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Write Files ONE AT A TIME                          │
│  ┌───────────────────────────────────────────────┐          │
│  │ FOR EACH file in files:                       │          │
│  │   1. Write file                               │          │
│  │   2. Run test commands                        │          │
│  │   3. IF test FAILS:                           │          │
│  │      → Jump to STEP 4 (Rollback)              │          │
│  │   4. IF test PASSES:                          │          │
│  │      → Continue to next file                  │          │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Rollback (IF FAILED)                               │
│  - Restore all files from checkpoint                        │
│  - Delete new files                                         │
│  - Log incident                                             │
│  - Report failure                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Report Results                                     │
│  IF SUCCESS:                                                │
│    ✓ List modified files                                    │
│    ✓ Show test output                                       │
│    ✓ Mark checkpoint for cleanup                            │
│                                                             │
│  IF FAILURE + ROLLED BACK:                                  │
│    ✗ Show error message                                     │
│    ✗ Confirm rollback complete                              │
│    ✗ Create incident report                                 │
│    ✗ Request team review                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### Checkpoint Structure
```
agents/
  checkpoints/
    checkpoint_20260304_143022/
      src_commands_builder.rs.bak    # Backup of existing file
      src_lib_api.ts.bak             # Backup of existing file
      src_types_index.ts.new         # Marker for new file (empty)
      metadata.json                  # Checkpoint metadata
```

### Metadata Format
```json
{
  "checkpoint_id": "checkpoint_20260304_143022",
  "timestamp": 1741104622,
  "agent_id": 1,
  "agent_name": "Token Counter",
  "files": [
    {
      "path": "src-tauri/src/commands/token_counter.rs",
      "existed_before": false,
      "hash": null
    },
    {
      "path": "src-tauri/Cargo.toml",
      "existed_before": true,
      "hash": "abc123..."
    }
  ],
  "test_commands": ["cargo check", "npm run build"],
  "status": "pending" | "success" | "rolled_back"
}
```

### Test Commands by Language
```python
TEST_COMMANDS = {
    "rust": ["cargo", "check"],
    "typescript": ["npm", "run", "build"],
    "typescript-fast": ["npx", "tsc", "--noEmit"],
    "python": ["python", "-m", "py_compile", "main.py"],
    "python-strict": ["mypy", "."],
}
```

---

## 🚨 Incident Response

### Severity Levels

**Level 1: Compilation Error**
- Rust: `cargo check` fails
- TS: `tsc` fails
- Action: Auto-rollback, notify developer

**Level 2: Runtime Error** (future)
- Unit tests fail
- Integration tests fail
- Action: Auto-rollback, create issue

**Level 3: Breaking Change**
- API contract changed
- Database schema changed
- Action: Block commit, require team review

### Incident Report Template
```markdown
## Agent Incident Report

**Checkpoint ID:** checkpoint_20260304_143022
**Agent:** Agent 1 - Token Counter
**Timestamp:** 2026-03-04 14:30:22
**Severity:** Level 1

### What Changed
- Modified: src-tauri/Cargo.toml
- Created: src-tauri/src/commands/token_counter.rs

### Failure Details
**Test Command:** cargo check
**Error:**
```
error[E0432]: unresolved import `tiktoken_rs`
 --> src/commands/token_counter.rs:1:5
  |
1 | use tiktoken_rs::Result;
  |     ^^^^^^^^^^^ use of undeclared crate or module `tiktoken_rs`
```

### Root Cause
Missing dependency declaration in Cargo.toml

### Suggested Fix
Add `tiktoken-rs = "0.5"` to [dependencies] in Cargo.toml

### Status
✅ Auto-rolled back to checkpoint

### Next Steps
1. Review suggested fix
2. Approve retry with corrected approach
3. Re-run agent with manual dependency addition first
```

---

## ✅ Best Practices

### For Agent Developers

1. **Always specify test commands** in AgentTask
   ```python
   AgentTask(
       ...
       test_commands=["cargo check", "npm run build"]
   )
   ```

2. **Keep changes small** - one feature per agent
   ```python
   # GOOD: Single responsibility
   output_files=["src-tauri/src/commands/token_counter.rs"]
   
   # BAD: Too many changes
   output_files=["file1.rs", "file2.rs", ..., "file20.rs"]
   ```

3. **Validate input files exist**
   ```python
   for file in task.input_files:
       assert (project_root / file).exists(), f"Missing: {file}"
   ```

4. **Provide clear error messages**
   ```python
   if not success:
       return f"ERROR: Failed to {task.description}: {error_details}"
   ```

### For Team Reviewers

1. **Review checkpoint before approving retry**
   ```bash
   cd agents/checkpoints/checkpoint_*
   git diff --no-index *.bak ../src/
   ```

2. **Check incident logs**
   ```bash
   cat agents/logs/incident_*.md
   ```

3. **Test manually before approving**
   ```bash
   cargo check && npm run build
   ```

---

## 🧪 Testing the Safety System

### Test 1: Verify Checkpoint Creation
```bash
cd agents
python agent_orchestrator_v2.py --task 1
# Should create checkpoint even on success
```

### Test 2: Verify Auto-Rollback
```bash
# Intentionally break something
echo "invalid rust code" > src-tauri/src/commands/test.rs

# Run agent
python agent_orchestrator_v2.py --task 1

# Should see:
# [FAIL] Tests failed after file modifications!
# [AUTO-ROLLBACK] Reverting changes...
```

### Test 3: Verify Checkpoint Cleanup
```bash
# After successful agent run
ls agents/checkpoints/
# Should keep last N checkpoints (configurable)
```

---

## 📊 Metrics to Track

- **Success Rate:** % of agents that complete without rollback
- **Rollback Rate:** % of agents that trigger auto-rollback
- **Mean Time to Recovery:** How fast rollbacks complete
- **Common Failure Points:** Which tests fail most often

---

## 🔮 Future Enhancements

1. **Incremental Rollback** - Only revert failed files, keep successes
2. **Smart Retry** - Auto-fix common errors and retry once
3. **Parallel Testing** - Run tests concurrently for speed
4. **Git Integration** - Use git stash instead of file backups
5. **Cloud Sync** - Store checkpoints in GitHub Gist

---

## 📞 Emergency Contacts

When in doubt:
1. Check `agents/logs/` for incident reports
2. Review `agents/checkpoints/` for safe restore points
3. Run `cargo check && npm run build` manually
4. Ask team before overriding safety protocols

**Remember:** It's better to rollback and retry than to break the build!
