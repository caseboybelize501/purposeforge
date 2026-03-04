# PurposeForge Agent Team v2

## ⚠️ SAFETY FIRST - CRITICAL

**Every agent follows the Safety Protocol:**

1. ✅ **Automatic Checkpoint** - Backup before ANY file change
2. ✅ **Test after EVERY file** - Not just at the end
3. ✅ **Auto-revert on failure** - Zero breaking changes allowed
4. ✅ **Team alignment required** - Before retry after rollback

**See `SAFETY_PROTOCOL.md` for complete implementation details.**

---

## Overview

This directory contains 8 specialized AI agents that implement architectural improvements to PurposeForge. Each agent is assigned to a specific model based on its capabilities.

### 🆕 New in v2
- **Automatic rollback** on test failure
- **Checkpoint system** for safe recovery
- **Test-after-every-file** enforcement
- **Incident reporting** and team alignment

---

## Available Models

```
Coding Models:
- qwen-coder-32b (19GB) - Primary code generation
- codestral-22b (13GB) - Git workflows, code review
- qwen3-coder:latest (18GB) - Backup coding

Reasoning Models:
- qwen35-35b (22GB) - Complex integration, architecture
- nemotron-claude (24GB) - AST analysis, optimization
- llama4:16x17b (67GB) - Heavy reasoning

Fast Models:
- qwen35-9b (6.5GB) - Quick API integrations
- glm-4.7-flash (18GB) - Error handling, docs
- qwen2.5-0.5b (531MB) - Ultra-fast simple tasks

Embedding:
- nomic-embed-text-v2-moe (957MB) - Semantic search
```

---

## Agent Roster

| # | Agent | Model | Task | Priority | Status |
|---|-------|-------|------|----------|--------|
| 1 | Token Counter | qwen-coder-32b | Prevent context overflow | HIGH | ✅ DONE |
| 2 | Code Validator | qwen-coder-32b | Pre-commit validation | HIGH | ✅ DONE |
| 3 | Git Workflow | codestral-22b | Branches & PRs | MEDIUM | ✅ DONE |
| 4 | Cloud Sync | qwen35-9b | GitHub Gist backup | MEDIUM | ⏳ PENDING |
| 5 | Template System | qwen-coder-32b | Dynamic templates | HIGH | ⏳ PENDING |
| 6 | AST Modifier | nemotron-claude | Safe code edits | HIGH | ⏳ PENDING |
| 7 | Error Handler | glm-4.7-flash | Retry & recovery | HIGH | ⏳ PENDING |
| 8 | Integrator | qwen35-35b | Testing & CI/CD | CRITICAL | ⏳ PENDING |

---

## Quick Start

### Run All Agents (with Safety)
```bash
cd agents
python agent_orchestrator_v2.py --auto-approve
```

### Run Specific Agent
```bash
python agent_orchestrator_v2.py --task 1  # Token counter
python agent_orchestrator_v2.py --task 2  # Code validator
python agent_orchestrator_v2.py --task 3  # Git branches
```

### Manual Test After Agent Run
```bash
# Always verify after any agent makes changes
cd ..
cargo check && npm run build
```

---

## Safety Architecture

### Checkpoint System
```
agents/
  checkpoints/
    checkpoint_20260304_143022/
      src_commands_builder.rs.bak    # Backup
      metadata.json                   # Metadata
```

### Auto-Rollback Flow
```
1. Agent modifies file → Test runs
2. Test FAILS → Auto-rollback triggered
3. All files restored from checkpoint
4. Incident report created
5. Team notified for review
```

### Test Commands
- **Rust:** `cargo check`
- **TypeScript:** `npm run build` or `tsc --noEmit`
- **Python:** `python -m py_compile main.py`

---

## File Structure

```
agents/
├── README.md                       # This file
├── SAFETY_PROTOCOL.md              # Detailed safety docs
├── agent_orchestrator_v2.py        # Main runner with safety
├── agent_01_token_counter.md       # Agent 1 spec
├── agent_02_code_validator.md      # Agent 2 spec
├── agent_03_git_branches.md        # Agent 3 spec
├── agent_04_cloud_sync.md          # Agent 4 spec
├── agent_05_dynamic_templates.md   # Agent 5 spec
├── agent_06_ast_modifier.md        # Agent 6 spec
├── agent_07_error_handling.md      # Agent 7 spec
├── agent_08_integration.md         # Agent 8 spec
├── checkpoints/                    # Auto-backups
│   ├── checkpoint_20260304_143022/
│   └── ...
├── logs/                           # Incident reports
│   └── incident_*.md
└── outputs/                        # Generated code
    ├── agent_1/
    ├── agent_2/
    └── ...
```

---

## Incident Response

### When an Agent Fails

1. **Check the logs:**
   ```bash
   cat agents/logs/incident_*.md
   ```

2. **Review the checkpoint:**
   ```bash
   cd agents/checkpoints/checkpoint_*
   ls
   ```

3. **Verify rollback:**
   ```bash
   cd ../..
   cargo check && npm run build
   ```

4. **Approve retry (if appropriate):**
   ```bash
   # Add comment to incident report
   # Then re-run agent with fixes
   python agents/agent_orchestrator_v2.py --task X
   ```

---

## Progress Tracking

### Completed ✅
- [x] **Agent 1: Token Counter** - Prevents AI context overflow
  - Files: `token_counter.rs`, TypeScript types, API wrappers
  - Tests: `cargo check`, `npm run build`
  - Status: ✅ Implemented and tested

- [x] **Agent 2: Code Validator** - Pre-push validation
  - Files: `validator.rs`, multi-language validation
  - Tests: TypeScript, Rust, Python validation
  - Status: ✅ Implemented and tested

- [x] **Agent 3: Git Branches** - Branch/PR workflow
  - Files: `github.rs` branch operations
  - Tests: `cargo check`, `npm run build`
  - Status: ✅ Implemented and tested

### In Progress 🚧
- [ ] **Agent 4: Cloud Sync** - GitHub Gist backup
- [ ] **Agent 5: Dynamic Templates** - Runtime loading
- [ ] **Agent 6: AST Modifier** - Tree-sitter integration
- [ ] **Agent 7: Error Handling** - Retry logic
- [ ] **Agent 8: Integration** - Full system tests

---

## Troubleshooting

### Build Failed After Agent Run
```bash
# 1. Check if rollback happened
ls agents/checkpoints/

# 2. Manually restore if needed
cd agents/checkpoints/checkpoint_*
# Copy .bak files back to original locations

# 3. Verify build
cd ../../..
cargo check && npm run build
```

### Agent Timeout
```bash
# Increase timeout in agent_orchestrator_v2.py
generate_with_model(..., timeout=900)  # 15 minutes
```

### Model Not Found
```bash
ollama pull qwen-coder-32b
ollama pull codestral-22b
ollama pull qwen35-35b
```

---

## Best Practices

### For Agents
1. **Small changes** - One feature per agent
2. **Clear tests** - Specify exact test commands
3. **Validate inputs** - Check files exist before modifying
4. **Error messages** - Provide actionable feedback

### For Humans
1. **Review checkpoints** before approving retries
2. **Check incident logs** for failure patterns
3. **Test manually** after agent success
4. **Never disable** auto-rollback in production

---

## Next Steps

1. ✅ Review completed agents (1-3)
2. 🚧 Continue with Agent 7 (Error Handling) - high priority
3. 🚧 Continue with Agent 5 (Dynamic Templates) - high priority
4. 🚧 Continue with Agent 4 (Cloud Sync) - medium priority
5. 🚧 Continue with Agent 6 (AST Modifier) - complex
6. 🚧 Finish with Agent 8 (Integration tests)

---

## Emergency Contacts

When stuck:
1. Check `agents/logs/` for incident reports
2. Review `agents/checkpoints/` for restore points
3. Run `cargo check && npm run build` manually
4. Ask team before overriding safety protocols

**Remember:** Better to rollback and retry than break the build! 🛡️
