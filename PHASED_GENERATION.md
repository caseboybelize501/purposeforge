# 4-Phase Code Generation Engine

## Overview

The PurposeForge 4-Phase Code Generation Engine transforms AI code generation from a single batch operation into a structured, transparent, and user-controlled process. Each phase builds upon the previous one, with explicit user confirmation required before proceeding.

---

## The 4 Phases

### Phase 1: Context & VRAM Assessment 📊

**Purpose:** Evaluate project feasibility before committing resources.

**What Happens:**
- AI analyzes the project scope, requirements, and complexity
- Estimates VRAM requirements, token budget, and generation time
- Determines if the project is feasible given available resources
- Provides warnings about potential issues

**Output:**
```json
{
  "canProceed": true,
  "estimatedVRAM": "12GB",
  "estimatedFileCount": 24,
  "estimatedTokens": 18500,
  "estimatedTimeSeconds": 620,
  "warnings": ["Large project may exceed token limits"],
  "reasoning": "This is a medium-large React application..."
}
```

**User Decision:** ✅ Proceed to Architecture | ❌ Revise Scope | ⏹️ Cancel

---

### Phase 2: Architecture & Repo Structure 🏗️

**Purpose:** Design the system architecture and technology stack.

**What Happens:**
- AI designs high-level system architecture
- Selects appropriate technology stack
- Creates directory structure
- Identifies design patterns to apply
- Documents key architectural decisions

**Output:**
```json
{
  "architecture": "markdown description...",
  "directoryStructure": "tree format...",
  "techStack": [
    {"name": "React", "version": "18.2.0", "purpose": "UI framework", "category": "frontend"}
  ],
  "patterns": ["Component Composition", "Custom Hooks"],
  "decisions": [...]
}
```

**User Decision:** ✅ Proceed to File List | ↩️ Redesign | ⏹️ Cancel

---

### Phase 3: File Manifest Generation 📋

**Purpose:** List every file that will be generated.

**What Happens:**
- AI creates a complete inventory of all files
- Each file includes path, description, estimated lines, category
- Files are grouped by category (config, components, utils, etc.)
- Core/critical files are marked
- File dependencies are identified

**Output:**
```json
{
  "files": [
    {
      "path": "src/main.tsx",
      "description": "React application entry point",
      "estimatedLines": 28,
      "category": "entry",
      "dependencies": ["src/App.tsx", "src/index.css"],
      "isCore": true
    }
  ],
  "totalEstimatedLines": 1847,
  "fileGroups": [...]
}
```

**User Decision:** 💻 Start Code Generation | ↩️ Revise List | ⏹️ Cancel

---

### Phase 4: Sequential Code Generation 💻

**Purpose:** Generate complete file content one file at a time.

**What Happens:**
- AI generates **one complete file at a time** (no batching)
- Each file is generated with full context of:
  - Project architecture (Phase 2)
  - Complete file manifest (Phase 3)
  - Already-generated files (for imports/references)
- Progress is shown in real-time
- User can **pause** or **stop** at any time
- Failed files can be retried individually

**Progress Display:**
```
Generating: src/components/Button.tsx (5/24)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 21%
Category: component | Est. Lines: 87
Description: Reusable button component with variants
```

**Controls:** ⏸️ Pause | ⏹️ Stop | (Auto-continues to next file)

**User Decision:** 🚀 Build & Push | 🔄 Start Over

---

## Architecture

### Frontend Components

```
src/
├── components/builder/
│   └── BuilderPanelPhased.tsx    # Main phased generation UI
├── hooks/
│   └── useQwenPhased.ts          # Phased generation state machine
├── lib/
│   └── phased-prompts.ts         # Phase-specific system prompts
└── types/
    └── phased-generation.ts      # Type definitions
```

### Backend (Rust)

```
src-tauri/src/
├── commands/
│   └── qwen.rs
│       ├── qwen_generate()           # Original single-call generation
│       ├── qwen_generate_phased()    # New phased generation endpoint
│       ├── build_assessment_prompt()
│       ├── build_architecture_prompt()
│       ├── build_manifest_prompt()
│       └── build_codegen_prompt()
└── main.rs
    └── invoke_handler![..., qwen_generate_phased]
```

### State Machine

```typescript
type GenerationPhase =
  | { stage: 'idle' }
  | { stage: 'phase1_assessment'; data: null }
  | { stage: 'phase1_complete'; data: AssessmentResult }
  | { stage: 'phase2_architecture'; data: { assessment: AssessmentResult } }
  | { stage: 'phase2_complete'; data: { assessment, architecture } }
  | { stage: 'phase3_manifest'; data: { assessment, architecture } }
  | { stage: 'phase3_complete'; data: { assessment, architecture, manifest } }
  | { stage: 'phase4_codegen'; data: Phase4Progress }
  | { stage: 'phase4_complete'; data: { files: GeneratedFile[] } }
  | { stage: 'ready_to_build' }
  | { stage: 'cancelled'; data: { reason, partialFiles } }
  | { stage: 'error'; data: { phase, error } };
```

---

## API Reference

### Frontend Hook

```typescript
const { phased } = useQwenPhased();

// Start Phase 1
await phased.startPhase1(context: PhasedGenerationContext);

// Continue to subsequent phases
await phased.continuePhase2();
await phased.continuePhase3();
await phased.continuePhase4(onFileComplete, onProgress);

// Control
phased.pause();
phased.resume();
phased.cancel();
phased.reset();

// Retry individual file
await phased.retryPhase4File(file);
```

### Rust Backend

```rust
#[tauri::command]
pub async fn qwen_generate_phased(
    app: AppHandle,
    location: QwenLocation,
    phase: String,        // "assessment" | "architecture" | "manifest" | "codegen"
    context: Value,       // Project context
    previous_results: Option<Value>,  // Results from previous phases
    codegen_file: Option<Value>,      // File spec for codegen phase
) -> Result<String, String>
```

---

## Key Design Decisions

### 1. No Batching in Phase 4

**Decision:** Each file is generated in a separate API call.

**Rationale:**
- Progress tracking per file
- User can stop after any file
- Better error recovery (retry individual files)
- Context stays within token limits
- Consistent generation quality across all files

### 2. User Confirmation Between Phases

**Decision:** Each phase requires explicit user confirmation before proceeding.

**Rationale:**
- User can review and validate each step
- Catch architectural issues early (before code generation)
- Transparency in AI decision-making
- User maintains control over the process

### 3. Context Accumulation

**Decision:** Each phase receives output from all previous phases.

**Rationale:**
- Phase 2 knows Phase 1's feasibility assessment
- Phase 3 knows Phase 2's architecture decisions
- Phase 4 knows the complete file manifest and architecture
- Consistent decisions across all phases

### 4. Phase State Persistence

**Decision:** State is maintained in React component state.

**Rationale:**
- Allows browser refresh recovery (with sessionStorage)
- User can navigate away and return
- Clear audit trail of generation process

---

## Usage Example

```typescript
// 1. User fills out form
setProjectName('my-app');
setDescription('A React todo app');
setFreeformPrompt('Use TypeScript, Tailwind CSS, add dark mode');

// 2. Start Phase 1
const context = buildContext();
await phased.startPhase1(context);
// User reviews: "✅ Can Proceed - 12GB VRAM, 24 files"

// 3. Continue to Phase 2
await phased.continuePhase2();
// User reviews: "Architecture: React + Tailwind + Zustand"

// 4. Continue to Phase 3
await phased.continuePhase3();
// User reviews: "24 files listed, 1,847 lines estimated"

// 5. Start Phase 4
await phased.continuePhase4(
  (file) => console.log('Completed:', file.path),
  (progress) => console.log('Progress:', progress.currentIndex + 1, '/', progress.totalFiles)
);
// User watches: "Generating: src/App.tsx (5/24) - 21%"

// 6. Build & Push
await buildAndPushProject({ generated_files: generatedFiles, ... });
```

---

## Error Handling

### Phase 1 Failure
- Model determines project is not feasible
- User can revise project scope or cancel

### Phase 2/3 Failure
- Model produces invalid architecture/manifest
- User can retry phase or go back

### Phase 4 File Failure
- Individual file generation fails
- Default: Continue to next file (log error)
- Option: Stop on first error
- Retry: `phased.retryPhase4File(file)`

### Cancellation
- User cancels at any point
- Partial files are preserved
- User can review what was generated

---

## Benefits Over Single-Call Generation

| Aspect | Single-Call | 4-Phase |
|--------|-------------|---------|
| **Transparency** | Black box | Clear step-by-step |
| **User Control** | All or nothing | Confirm each phase |
| **Error Recovery** | Start over | Retry individual files |
| **Progress** | Unknown until done | Real-time tracking |
| **Context** | Limited by tokens | Accumulated across phases |
| **File Quality** | May rush end | Consistent per-file |
| **Token Budget** | One large call | Distributed across phases |

---

## Future Enhancements

1. **Phase 0: Requirements Clarification**
   - AI asks clarifying questions before assessment
   - Interactive requirements gathering

2. **Parallel Phase 4**
   - Generate independent files in parallel
   - Speed up large projects

3. **Phase 5: Review & Refinement**
   - AI reviews generated code
   - Suggests improvements
   - Applies refactoring

4. **Test Generation**
   - Automatic test file creation
   - Test-driven generation mode

5. **Documentation Phase**
   - Auto-generate API docs
   - README refinement
   - Inline documentation

---

## Troubleshooting

### "Model determined project cannot proceed"
- Project scope is too large for available resources
- Reduce requirements or break into smaller projects
- Use a larger model with more VRAM

### "Invalid JSON response"
- Model output was malformed
- Retry the phase
- Try a different model

### Phase 4 stuck on a file
- Model may be struggling with complex file
- Click Pause, then Resume
- Or Stop and retry the specific file

### Token limit exceeded
- Project is larger than estimated
- Consider splitting into multiple projects
- Use a model with larger context window

---

## Related Files

- `src/types/phased-generation.ts` - Type definitions
- `src/lib/phased-prompts.ts` - System prompts
- `src/hooks/useQwenPhased.ts` - State machine hook
- `src/components/builder/BuilderPanelPhased.tsx` - UI component
- `src-tauri/src/commands/qwen.rs` - Rust backend
- `src/App.css` - Phased builder styles
