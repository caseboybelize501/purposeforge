/**
 * Phased Code Generation System Prompts
 * 
 * Each phase has a specialized prompt designed for its specific task.
 * All prompts enforce JSON-only output with no markdown wrapping.
 */

import type {
  PhasedGenerationContext,
  AssessmentResult,
  ArchitectureResult,
  ManifestResult,
  GeneratedFile,
  ManifestFile,
  FileGroup,
  FileCategory,
} from '../types';

// ============================================================================
// Base Instructions (applied to all phases)
// ============================================================================

const BASE_INSTRUCTIONS = `You are an expert software engineer working in a structured 4-phase development process.

OUTPUT FORMAT REQUIREMENTS:
- Respond ONLY with valid JSON
- NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO text before the opening brace/bracket
- NO text after the closing brace/bracket
- NO explanations, preamble, or commentary
- Escape all special JSON characters properly:
  - Newlines as \\n (literal backslash-n, NOT actual line breaks)
  - Double quotes as \\"
  - Backslashes as \\\\
  - Tabs as \\t

Your output must be parseable JSON that can be used programmatically.`;

// ============================================================================
// Phase 1: Context & VRAM Assessment
// ============================================================================

export const PHASE1_SYSTEM_PROMPT = `${BASE_INSTRUCTIONS}

PHASE 1 TASK: Project Feasibility Assessment

You are evaluating whether a project request is feasible given the constraints.
Analyze the project scope and provide an honest assessment of:
1. Whether you can complete it (canProceed)
2. Resource requirements (VRAM, tokens, time)
3. Any warnings or concerns

INPUT CONTEXT:
- Project Name: {projectName}
- Description: {description}
- Requirements: {requirements}
- Selected Skills: {selectedSkills}
- Available VRAM: {availableVRAM}
- Model: {modelName}

ASSESSMENT CRITERIA:
- canProceed: false if project is too large, ambiguous, or beyond capabilities
- estimatedVRAM: Based on model requirements and context window needs
  - "6GB" for small projects (<10 files, <5K tokens)
  - "8GB" for medium projects (10-25 files, 5K-15K tokens)
  - "12GB" for large projects (25-50 files, 15K-30K tokens)
  - "16GB" for very large projects (50-100 files, 30K-60K tokens)
  - "24GB+" for massive projects (>100 files, >60K tokens)
- estimatedFileCount: Realistic count including config, source, tests, docs
- estimatedTokens: Total tokens for ALL phases combined
- estimatedTimeSeconds: Based on model speed (~10-30 tokens/sec typical)
- warnings: Include concerns about scope, ambiguity, technical debt, etc.

RESPONSE FORMAT (exact JSON structure):
{
  "canProceed": boolean,
  "estimatedVRAM": "8GB" | "12GB" | "16GB" | "24GB+",
  "estimatedFileCount": number,
  "estimatedTokens": number,
  "estimatedTimeSeconds": number,
  "warnings": ["warning1", "warning2"],
  "reasoning": "Detailed explanation of your assessment. Include specific concerns about scope, technical complexity, token budget, and any recommendations for breaking the project into smaller pieces if needed."
}

EXAMPLE RESPONSE:
{
  "canProceed": true,
  "estimatedVRAM": "12GB",
  "estimatedFileCount": 24,
  "estimatedTokens": 18500,
  "estimatedTimeSeconds": 620,
  "warnings": ["Large project may exceed token limits", "Consider modular architecture"],
  "reasoning": "This is a medium-large React application with backend API. The 24 estimated files include components, utilities, API routes, and configuration. Token estimate includes all 4 phases. VRAM requirement is moderate due to context accumulation across phases."
}`;

// ============================================================================
// Phase 2: Architecture & Repo Structure
// ============================================================================

export const PHASE2_SYSTEM_PROMPT = `${BASE_INSTRUCTIONS}

PHASE 2 TASK: Architecture Design & Repository Structure

You are designing the software architecture based on the feasibility assessment.
Create a comprehensive architectural plan that will guide file generation.

INPUT CONTEXT:
- Project Name: {projectName}
- Description: {description}
- Requirements: {requirements}
- Assessment: {assessmentSummary}
- Selected Skills: {selectedSkills}

ARCHITECTURE DESIGN CONSIDERATIONS:
1. Choose appropriate architectural pattern (MVC, Clean Architecture, Microservices, etc.)
2. Select technology stack that matches requirements
3. Design directory structure for scalability and maintainability
4. Identify key design patterns to apply
5. Document important architectural decisions

RESPONSE FORMAT (exact JSON structure):
{
  "architecture": "markdown-formatted architecture description. Include:
    - System overview and key components
    - Data flow description
    - Component relationships
    - External integrations
    - Security considerations",
  
  "directoryStructure": "tree-formatted directory structure. Example:
    my-project/
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── utils/
    │   └── main.tsx
    ├── package.json
    └── README.md",
  
  "techStack": [
    {
      "name": "React",
      "version": "18.2.0",
      "purpose": "UI framework",
      "category": "frontend"
    }
  ],
  
  "patterns": ["Component Composition", "Custom Hooks", "Context API"],
  
  "decisions": [
    {
      "title": "Use TypeScript over JavaScript",
      "description": "All code will be written in TypeScript",
      "rationale": "Better type safety, IDE support, and maintainability",
      "alternatives": "Plain JavaScript with JSDoc"
    }
  ]
}

GUIDELINES:
- architecture: Be specific about HOW components interact, not just WHAT they are
- directoryStructure: Use consistent indentation, show all levels
- techStack: Include version numbers when relevant
- patterns: Name specific patterns, not generic concepts
- decisions: Include at least 2-3 key architectural decisions`;

// ============================================================================
// Phase 3: File Manifest Generation
// ============================================================================

export const PHASE3_SYSTEM_PROMPT = `${BASE_INSTRUCTIONS}

PHASE 3 TASK: Complete File Manifest Generation

You are creating a comprehensive list of ALL files that need to be generated.
This manifest will be used to generate files one-by-one in Phase 4.

INPUT CONTEXT:
- Project Name: {projectName}
- Architecture: {architectureSummary}
- Directory Structure: {directoryStructure}
- Assessment File Count Estimate: {estimatedFileCount}
- Selected Skills: {selectedSkills}

FILE CATEGORIES:
- "entry": Main entry points (main.tsx, index.py, main.rs, Cargo.toml)
- "config": Configuration files (package.json, tsconfig.json, .gitignore)
- "component": UI components (React, Vue, etc.)
- "utility": Helper functions, utils, shared code
- "api": API routes, controllers, handlers
- "model": Data models, types, interfaces, schemas
- "style": CSS, SCSS, styled-components, Tailwind config
- "test": Test files (unit, integration, e2e)
- "documentation": README, docs, comments
- "other": Anything else

MANIFEST REQUIREMENTS:
1. Include EVERY file needed for a complete, runnable project
2. Do NOT skip any files - even trivial ones
3. Order files logically (config first, then entry, then source)
4. Mark core files that are critical to project function
5. List dependencies between files

RESPONSE FORMAT (exact JSON structure):
{
  "files": [
    {
      "path": "package.json",
      "description": "Project configuration and dependencies",
      "estimatedLines": 45,
      "category": "config",
      "dependencies": [],
      "isCore": true
    },
    {
      "path": "src/main.tsx",
      "description": "React application entry point",
      "estimatedLines": 28,
      "category": "entry",
      "dependencies": ["src/App.tsx", "src/index.css"],
      "isCore": true
    }
  ],
  "totalEstimatedLines": number,
  "fileGroups": [
    {
      "name": "Configuration",
      "category": "config",
      "files": [/* subset of files from main array */],
      "totalLines": number
    }
  ]
}

GUIDELINES:
- files: Array of ALL files, ordered by generation priority
- path: Use forward slashes, relative to project root
- description: One sentence explaining file purpose
- estimatedLines: Realistic estimate (affects Phase 4 timing)
- category: One of the defined categories above
- dependencies: Array of other file paths this file depends on
- isCore: true for files without which the project cannot run
- fileGroups: Group files by category for organized display

CRITICAL: 
- Include package.json/requirements.txt/Cargo.toml for dependency management
- Include .gitignore for version control
- Include README.md for documentation
- Include ALL source files - do not say "etc" or "..."`;

// ============================================================================
// Phase 4: Sequential Code Generation
// ============================================================================

export const PHASE4_SYSTEM_PROMPT = `${BASE_INSTRUCTIONS}

PHASE 4 TASK: Single File Code Generation

You are generating the COMPLETE content for ONE specific file.
This is one file in a larger project being built across multiple generations.

INPUT CONTEXT:
- Project Name: {projectName}
- Current File: {currentFilePath}
- File Description: {currentFileDescription}
- Estimated Lines: {estimatedLines}
- Architecture Summary: {architectureSummary}
- Complete File Manifest: {manifestSummary}
- Already Generated Files: {generatedFilesContext}
- Selected Skills: {selectedSkills}

CODE GENERATION REQUIREMENTS:
1. Generate COMPLETE, working code - no placeholders or TODOs
2. Match the estimated line count reasonably
3. Follow the architecture and patterns defined in Phase 2
4. Import/reference other files as listed in the manifest
5. Include appropriate comments and documentation
6. Handle errors and edge cases appropriately
7. Follow best practices for the language/framework

RESPONSE FORMAT (exact JSON structure):
{
  "path": "{currentFilePath}",
  "content": "FULL FILE CONTENT HERE"
}

CONTENT FORMATTING RULES:
- Include ALL imports at the top
- Use proper indentation (2 spaces for JS/TS, 4 for Python)
- Escape ALL special JSON characters:
  - Actual newlines → \\n (literal backslash-n)
  - Double quotes → \\"
  - Backslashes → \\\\
- Do NOT include markdown code blocks
- Do NOT include file path comments at top
- Do NOT truncate - write the complete file

EXAMPLE FOR A TYPESCRIPT FILE:
{
  "path": "src/utils/format.ts",
  "content": "export function formatDate(date: Date): string {\\n  const year = date.getFullYear();\\n  const month = String(date.getMonth() + 1).padStart(2, '0');\\n  const day = String(date.getDate()).padStart(2, '0');\\n  return \`\${year}-\${month}-\${day}\`;\\n}\\n\\nexport function formatCurrency(amount: number, currency: string = 'USD'): string {\\n  return new Intl.NumberFormat('en-US', {\\n    style: 'currency',\\n    currency,\\n  }).format(amount);\\n}\\n"
}

CONTEXT AWARENESS:
- If this file depends on already-generated files, import them correctly
- If other files will import this file, export appropriately
- Maintain consistency with the project's coding style
- Follow the directory structure from Phase 2`;

// ============================================================================
// Prompt Builders
// ============================================================================

/**
 * Build Phase 1 prompt from context
 */
export function buildPhase1Prompt(context: PhasedGenerationContext): string {
  return PHASE1_SYSTEM_PROMPT
    .replace('{projectName}', context.projectName)
    .replace('{description}', context.description)
    .replace('{requirements}', context.requirements)
    .replace('{selectedSkills}', context.selectedSkills.join(', ') || 'None')
    .replace('{availableVRAM}', context.availableVRAM || 'Unknown')
    .replace('{modelName}', context.modelName);
}

/**
 * Build Phase 2 prompt from context and Phase 1 result
 */
export function buildPhase2Prompt(
  context: PhasedGenerationContext,
  assessment: AssessmentResult
): string {
  return PHASE2_SYSTEM_PROMPT
    .replace('{projectName}', context.projectName)
    .replace('{description}', context.description)
    .replace('{requirements}', context.requirements)
    .replace('{assessmentSummary}', assessment.reasoning)
    .replace('{selectedSkills}', context.selectedSkills.join(', ') || 'None');
}

/**
 * Build Phase 3 prompt from context and Phase 2 result
 */
export function buildPhase3Prompt(
  context: PhasedGenerationContext,
  architecture: ArchitectureResult,
  assessment: AssessmentResult
): string {
  const architectureSummary = architecture.architecture.substring(0, 500) + '...';

  return PHASE3_SYSTEM_PROMPT
    .replace('{projectName}', context.projectName)
    .replace('{architectureSummary}', architectureSummary)
    .replace('{directoryStructure}', architecture.directoryStructure)
    .replace('{estimatedFileCount}', String(assessment.estimatedFileCount))
    .replace('{selectedSkills}', context.selectedSkills.join(', ') || 'None');
}

/**
 * Build Phase 4 prompt for a specific file
 */
export function buildPhase4Prompt(
  context: PhasedGenerationContext,
  file: ManifestFile,
  architecture: ArchitectureResult,
  manifest: ManifestResult,
  generatedFiles: GeneratedFile[]
): string {
  const architectureSummary = architecture.architecture.substring(0, 300) + '...';
  
  const manifestSummary = manifest.files
    .map(f => `  - ${f.path} (${f.category})`)
    .join('\n');
  
  const generatedContext = generatedFiles.length > 0
    ? generatedFiles
        .map(f => `  - ${f.path}: ${f.content.substring(0, 100)}...`)
        .join('\n')
    : 'None yet';
  
  return PHASE4_SYSTEM_PROMPT
    .replace('{projectName}', context.projectName)
    .replace('{currentFilePath}', file.path)
    .replace('{currentFileDescription}', file.description)
    .replace('{estimatedLines}', String(file.estimatedLines))
    .replace('{architectureSummary}', architectureSummary)
    .replace('{manifestSummary}', manifestSummary)
    .replace('{generatedFilesContext}', generatedContext)
    .replace('{selectedSkills}', context.selectedSkills.join(', ') || 'None');
}

/**
 * Parse Phase 1 JSON response
 */
export function parsePhase1Response(raw: string): AssessmentResult {
  const cleaned = cleanJsonResponse(raw);
  const parsed = JSON.parse(cleaned);
  
  return {
    canProceed: parsed.canProceed ?? false,
    estimatedVRAM: parsed.estimatedVRAM ?? 'Unknown',
    estimatedFileCount: parsed.estimatedFileCount ?? 0,
    estimatedTokens: parsed.estimatedTokens ?? 0,
    estimatedTimeSeconds: parsed.estimatedTimeSeconds ?? 0,
    warnings: parsed.warnings ?? [],
    reasoning: parsed.reasoning ?? '',
    modelResponse: raw,
  };
}

/**
 * Parse Phase 2 JSON response
 */
export function parsePhase2Response(raw: string): ArchitectureResult {
  const cleaned = cleanJsonResponse(raw);
  const parsed = JSON.parse(cleaned);
  
  return {
    architecture: parsed.architecture ?? '',
    directoryStructure: parsed.directoryStructure ?? '',
    techStack: parsed.techStack ?? [],
    patterns: parsed.patterns ?? [],
    decisions: parsed.decisions ?? [],
    modelResponse: raw,
  };
}

/**
 * Parse Phase 3 JSON response
 */
export function parsePhase3Response(raw: string): ManifestResult {
  const cleaned = cleanJsonResponse(raw);
  const parsed = JSON.parse(cleaned);
  
  const files = parsed.files ?? [];
  const totalLines = files.reduce((sum: number, f: any) => sum + (f.estimatedLines || 0), 0);
  
  // Group files by category
  const categoryMap = new Map<FileCategory, any[]>();
  files.forEach((f: any) => {
    const cat: FileCategory = (f.category as FileCategory) || 'other';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(f);
  });

  const fileGroups: FileGroup[] = Array.from(categoryMap.entries()).map(([category, files]) => ({
    name: getCategoryName(category),
    category,
    files,
    totalLines: files.reduce((sum: number, f: any) => sum + (f.estimatedLines || 0), 0),
  }));
  
  return {
    files,
    totalEstimatedLines: totalLines,
    fileGroups,
    modelResponse: raw,
  };
}

/**
 * Parse Phase 4 JSON response
 */
export function parsePhase4Response(raw: string, expectedPath: string): GeneratedFile {
  const cleaned = cleanJsonResponse(raw);
  const parsed = JSON.parse(cleaned);
  
  return {
    path: parsed.path ?? expectedPath,
    content: parsed.content ?? '',
  };
}

/**
 * Clean raw AI response for JSON parsing
 */
function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^[^[\{]*/g, '')
    .replace(/[^}\]]*$/g, '')
    .trim();
}

/**
 * Get display name for file category
 */
function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    entry: 'Entry Points',
    config: 'Configuration',
    component: 'Components',
    utility: 'Utilities',
    api: 'API',
    model: 'Models',
    style: 'Styles',
    test: 'Tests',
    documentation: 'Documentation',
    other: 'Other',
  };
  return names[category] || category;
}
