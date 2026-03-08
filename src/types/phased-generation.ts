/**
 * Phased Code Generation Types
 * 
 * Defines the 4-phase generation pipeline:
 * Phase 1: Context & VRAM Assessment
 * Phase 2: Architecture & Repo Structure
 * Phase 3: File Manifest Generation
 * Phase 4: Sequential Code Generation (1-by-1)
 */

// ============================================================================
// Phase State Machine
// ============================================================================

export type GenerationPhase =
  | { stage: 'idle' }
  | { stage: 'phase1_assessment'; data: null }
  | { stage: 'phase1_complete'; data: AssessmentResult }
  | { stage: 'phase2_architecture'; data: { assessment: AssessmentResult } }
  | { stage: 'phase2_complete'; data: { assessment: AssessmentResult; architecture: ArchitectureResult } }
  | { stage: 'phase3_manifest'; data: { assessment: AssessmentResult; architecture: ArchitectureResult } }
  | { stage: 'phase3_complete'; data: { assessment: AssessmentResult; architecture: ArchitectureResult; manifest: ManifestResult } }
  | { stage: 'phase4_codegen'; data: Phase4Progress }
  | { stage: 'phase4_complete'; data: { files: GeneratedFile[] } }
  | { stage: 'ready_to_build'; data: { files: GeneratedFile[] } }
  | { stage: 'cancelled'; data: { reason: string; partialFiles: GeneratedFile[] } }
  | { stage: 'error'; data: { phase: string; error: string } };

// ============================================================================
// Phase 1: Assessment Result
// ============================================================================

export interface AssessmentResult {
  /** Whether the model believes it can complete this project */
  canProceed: boolean;
  
  /** Estimated VRAM requirement (e.g., "8GB", "12GB", "16GB", "24GB+") */
  estimatedVRAM: string;
  
  /** Estimated number of files to generate */
  estimatedFileCount: number;
  
  /** Estimated total tokens for full generation */
  estimatedTokens: number;
  
  /** Estimated generation time in seconds */
  estimatedTimeSeconds: number;
  
  /** Any warnings about the project scope */
  warnings: string[];
  
  /** Model's reasoning about feasibility */
  reasoning: string;
  
  /** Raw model response for display/debugging */
  modelResponse: string;
}

export interface AssessmentRequest {
  projectName: string;
  description: string;
  requirements: string;
  selectedSkills: string[];
  availableVRAM: string;
  modelName: string;
}

// ============================================================================
// Phase 2: Architecture Result
// ============================================================================

export interface ArchitectureResult {
  /** High-level architecture description in markdown */
  architecture: string;
  
  /** Directory structure in tree format */
  directoryStructure: string;
  
  /** Technology stack to be used */
  techStack: TechStackItem[];
  
  /** Design patterns being applied */
  patterns: string[];
  
  /** Key architectural decisions */
  decisions: ArchitecturalDecision[];
  
  /** Raw model response for display/debugging */
  modelResponse: string;
}

export interface TechStackItem {
  name: string;
  version?: string;
  purpose: string;
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'testing' | 'other';
}

export interface ArchitecturalDecision {
  title: string;
  description: string;
  rationale: string;
  alternatives?: string;
}

export interface ArchitectureRequest {
  projectName: string;
  description: string;
  requirements: string;
  assessment: AssessmentResult;
  selectedSkills: string[];
}

// ============================================================================
// Phase 3: Manifest Result
// ============================================================================

export interface ManifestResult {
  /** Complete list of files to generate */
  files: ManifestFile[];
  
  /** Total estimated lines of code */
  totalEstimatedLines: number;
  
  /** Grouping of files by category */
  fileGroups: FileGroup[];
  
  /** Raw model response for display/debugging */
  modelResponse: string;
}

export interface ManifestFile {
  /** Relative file path (e.g., "src/components/Button.tsx") */
  path: string;
  
  /** Brief description of file purpose */
  description: string;
  
  /** Estimated lines of code */
  estimatedLines: number;
  
  /** File category */
  category: FileCategory;
  
  /** Dependencies on other files (paths) */
  dependencies: string[];
  
  /** Whether this is a critical/core file */
  isCore: boolean;
}

export type FileCategory = 
  | 'entry'           // main.tsx, index.py, Cargo.toml
  | 'config'          // package.json, tsconfig.json, .gitignore
  | 'component'       // React components
  | 'utility'         // Helper functions, utils
  | 'api'            // API routes, controllers
  | 'model'          // Data models, types
  | 'style'          // CSS, SCSS, styled components
  | 'test'           // Test files
  | 'documentation'   // README, docs
  | 'other';

export interface FileGroup {
  name: string;
  category: FileCategory;
  files: ManifestFile[];
  totalLines: number;
}

export interface ManifestRequest {
  projectName: string;
  architecture: ArchitectureResult;
  assessment: AssessmentResult;
  selectedSkills: string[];
}

// ============================================================================
// Phase 4: Code Generation Progress
// ============================================================================

export interface Phase4Progress {
  /** Current file being generated */
  currentFile: ManifestFile;
  
  /** Index of current file (0-based) */
  currentIndex: number;
  
  /** Total files to generate */
  totalFiles: number;
  
  /** Files already completed */
  completedFiles: GeneratedFile[];
  
  /** Files remaining */
  remainingFiles: ManifestFile[];
  
  /** Current generation status */
  status: CodegenStatus;
  
  /** Current token stream content */
  currentContent: string;
  
  /** Errors encountered */
  errors: CodegenError[];
}

export type CodegenStatus =
  | 'idle'
  | 'generating'      // Currently streaming tokens
  | 'parsing'         // Parsing JSON response
  | 'complete'        // File completed successfully
  | 'error'           // Error generating this file
  | 'paused'          // User paused generation
  | 'cancelled';      // User cancelled

export interface CodegenError {
  filePath: string;
  error: string;
  retryable: boolean;
  timestamp: number;
}

export interface GeneratedFileWithMeta extends GeneratedFile {
  /** Source manifest file */
  manifest: ManifestFile;
  
  /** Generation timestamp */
  generatedAt: number;
  
  /** Generation duration in ms */
  durationMs: number;
  
  /** Token count */
  tokenCount: number;
  
  /** Whether file was regenerated */
  isRetry: boolean;
}

// ============================================================================
// Phase 4: Code Generation Request/Response
// ============================================================================

export interface CodegenRequest {
  /** File to generate */
  file: ManifestFile;
  
  /** Project context */
  projectName: string;
  
  /** Full architecture context */
  architecture: ArchitectureResult;
  
  /** Complete file manifest */
  manifest: ManifestResult;
  
  /** Already generated files (for context) */
  generatedFiles: GeneratedFile[];
  
  /** Selected skills */
  selectedSkills: string[];
}

export interface CodegenResponse {
  success: boolean;
  file?: GeneratedFile;
  error?: string;
  tokenCount: number;
  durationMs: number;
}

// ============================================================================
// Combined Types
// ============================================================================

export interface PhasedGenerationContext {
  /** Original user request */
  prompt: string;
  
  /** Project name */
  projectName: string;
  
  /** Project description */
  description: string;
  
  /** Additional requirements */
  requirements: string;
  
  /** Selected skills */
  selectedSkills: string[];
  
  /** Active project path (if modifying) */
  activeProjectPath: string | null;
  
  /** Model being used */
  modelName: string;
  
  /** Available VRAM (if known) */
  availableVRAM: string | null;
}

export interface PhasedGenerationState {
  /** Current phase */
  phase: GenerationPhase;
  
  /** Generation context */
  context: PhasedGenerationContext | null;
  
  /** Phase 1 result */
  assessment: AssessmentResult | null;
  
  /** Phase 2 result */
  architecture: ArchitectureResult | null;
  
  /** Phase 3 result */
  manifest: ManifestResult | null;
  
  /** Phase 4 generated files */
  generatedFiles: GeneratedFile[];
  
  /** Phase 4 progress */
  codegenProgress: Phase4Progress | null;
  
  /** Error state */
  error: string | null;
  
  /** Whether generation is paused */
  paused: boolean;
  
  /** Whether generation is cancelled */
  cancelled: boolean;
}

// ============================================================================
// Callback Types
// ============================================================================

export type PhaseCallback<T> = (result: T) => void;

export interface PhaseCallbacks {
  onPhase1Complete: PhaseCallback<AssessmentResult>;
  onPhase2Complete: PhaseCallback<ArchitectureResult>;
  onPhase3Complete: PhaseCallback<ManifestResult>;
  onPhase4FileComplete: PhaseCallback<GeneratedFile>;
  onPhase4Progress: PhaseCallback<Phase4Progress>;
  onPhase4Complete: PhaseCallback<GeneratedFile[]>;
  onError: PhaseCallback<{ phase: string; error: string }>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface StartPhasedGenerationRequest {
  phase: 'assessment';
  context: PhasedGenerationContext;
}

export interface ContinueGenerationRequest {
  phase: 'architecture' | 'manifest' | 'codegen';
  context: PhasedGenerationContext;
  previousResults: {
    assessment?: AssessmentResult;
    architecture?: ArchitectureResult;
    manifest?: ManifestResult;
  };
  codegenFile?: ManifestFile; // For codegen phase
}

export interface PhasedGenerationResponse {
  success: boolean;
  phase: string;
  result: AssessmentResult | ArchitectureResult | ManifestResult | GeneratedFile | null;
  error?: string;
}

// ============================================================================
// Existing GeneratedFile type (re-export for compatibility)
// ============================================================================

export interface GeneratedFile {
  path: string;
  content: string;
}
