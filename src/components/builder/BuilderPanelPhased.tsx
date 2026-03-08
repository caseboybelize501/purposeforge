/**
 * Phased Builder Panel - 4-Phase Code Generation
 * 
 * Phase 1: Context & VRAM Assessment
 * Phase 2: Architecture & Repo Structure  
 * Phase 3: File Manifest Generation
 * Phase 4: Sequential Code Generation (1-by-1)
 */

import { useState, useEffect } from 'react';
import { getTemplates, buildAndPushProject, getSkills } from '../../lib/api';
import { useModelPhased } from '../../hooks/useModelPhased';
import type {
  ProjectTemplate, ModelLocation, Skill,
  PhasedGenerationContext
} from '../../types';

interface Props {
  modelLocation: ModelLocation | null;
  onProjectCreated: () => void;
  activeProjectPath: string | null;
}

export default function BuilderPanelPhased({ modelLocation, onProjectCreated, activeProjectPath }: Props) {
  // Setup form state
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [mode, setMode] = useState<'template' | 'freeform'>('template');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [freeformPrompt, setFreeformPrompt] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [isPrivate, setIsPrivate] = useState(false);
  const [outputDir, setOutputDir] = useState('D:\\Users\\CASE\\Projects');
  const [error, setError] = useState<string | null>(null);

  // Use phased generation hook
  const { phased } = useModelPhased();
  const {
    phase,
    assessment,
    architecture,
    manifest,
    generatedFiles,
    codegenProgress,
    paused,
    startPhase1,
    continuePhase2,
    continuePhase3,
    continuePhase4,
    pause,
    resume,
    cancel,
    reset,
  } = phased;

  // If we have an activeProjectPath, default outputDir and projectName to it
  useEffect(() => {
    if (activeProjectPath) {
      const parts = activeProjectPath.split(/[/\\]/);
      const name = parts[parts.length - 1];
      const dir = parts.slice(0, -1).join('\\');
      if (name) setProjectName(name);
      if (dir) setOutputDir(dir);
    }
  }, [activeProjectPath]);

  // Load templates and skills
  useEffect(() => {
    getTemplates().then(setTemplates).catch(console.error);
    getSkills().then(setSkills).catch(console.error);
  }, []);

  // Build generation context from form inputs
  const buildContext = (): PhasedGenerationContext => ({
    prompt: freeformPrompt || description,
    projectName: projectName || 'Unnamed Project',
    description,
    requirements: freeformPrompt,
    selectedSkills: Array.from(selectedSkills),
    activeProjectPath,
    modelName: modelLocation?.model || 'Unknown',
    availableVRAM: null, // Could be detected from GPU
  });

  // Phase 1: Start assessment
  const handleStartAssessment = async () => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    setError(null);
    try {
      await startPhase1(buildContext());
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Phase 2: Continue to architecture
  const handleContinueArchitecture = async () => {
    setError(null);
    try {
      await continuePhase2();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Phase 3: Continue to manifest
  const handleContinueManifest = async () => {
    setError(null);
    try {
      await continuePhase3();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Phase 4: Start code generation
  const handleStartCodegen = async () => {
    setError(null);
    try {
      await continuePhase4(
        (file) => console.log('File completed:', file.path),
        (progress) => console.log('Progress:', progress.currentIndex + 1, '/', progress.totalFiles)
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Build and push after all phases complete
  const handleBuildProject = async () => {
    try {
      const result = await buildAndPushProject({
        project_name: projectName,
        description,
        template_id: selectedTemplate || null,
        freeform_prompt: freeformPrompt || null,
        generated_files: generatedFiles,
        private_repo: isPrivate,
        output_dir: outputDir,
      });
      
      if (result.success) {
        onProjectCreated();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReset = () => {
    reset();
    setProjectName('');
    setDescription('');
    setFreeformPrompt('');
    setError(null);
  };

  // Render phase indicator
  const renderPhaseIndicator = () => {
    const phases = [
      { key: 'phase1', label: 'Assessment', icon: '📊' },
      { key: 'phase2', label: 'Architecture', icon: '🏗️' },
      { key: 'phase3', label: 'File List', icon: '📋' },
      { key: 'phase4', label: 'Code Gen', icon: '💻' },
    ];

    const getPhaseStatus = (index: number) => {
      const stage = phase.stage;
      const phaseNum = index + 1;

      if (stage === 'idle') return 'pending';
      if (stage.startsWith(`phase${phaseNum}`)) return 'active';
      if (stage === `phase${phaseNum}_complete` || 
          (phaseNum === 1 && ['phase2_architecture', 'phase2_complete', 'phase3_manifest', 'phase3_complete', 'phase4_codegen', 'phase4_complete', 'ready_to_build'].includes(stage)) ||
          (phaseNum === 2 && ['phase3_manifest', 'phase3_complete', 'phase4_codegen', 'phase4_complete', 'ready_to_build'].includes(stage)) ||
          (phaseNum === 3 && ['phase4_codegen', 'phase4_complete', 'ready_to_build'].includes(stage)) ||
          (phaseNum === 4 && ['phase4_complete', 'ready_to_build'].includes(stage))) {
        return 'complete';
      }
      return 'pending';
    };

    return (
      <div className="phase-indicator">
        {phases.map((p, i) => {
          const status = getPhaseStatus(i);
          return (
            <div key={p.key} className={`phase-step ${status}`}>
              <span className="phase-icon">{p.icon}</span>
              <span className="phase-label">{p.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Phase 1: Assessment View
  const renderPhase1View = () => (
    <div className="phase-view">
      <h3>Phase 1: Project Assessment</h3>
      <p className="phase-description">
        AI is evaluating project feasibility, estimating resource requirements, and checking if the scope is manageable.
      </p>
      
      {assessment && (
        <div className="assessment-result">
          <div className={`assessment-status ${assessment.canProceed ? 'go' : 'no-go'}`}>
            {assessment.canProceed ? '✅ Can Proceed' : '❌ Cannot Proceed'}
          </div>
          
          <div className="assessment-metrics">
            <div className="metric">
              <span className="metric-label">Estimated VRAM</span>
              <span className="metric-value">{assessment.estimatedVRAM}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Estimated Files</span>
              <span className="metric-value">{assessment.estimatedFileCount}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Estimated Tokens</span>
              <span className="metric-value">{assessment.estimatedTokens.toLocaleString()}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Est. Time</span>
              <span className="metric-value">{Math.round(assessment.estimatedTimeSeconds / 60)} min</span>
            </div>
          </div>
          
          {assessment.warnings.length > 0 && (
            <div className="assessment-warnings">
              <h4>⚠️ Warnings</h4>
              <ul>
                {assessment.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="assessment-reasoning">
            <h4>Analysis</h4>
            <p>{assessment.reasoning}</p>
          </div>
        </div>
      )}
      
      <div className="phase-actions">
        {phase.stage === 'phase1_assessment' && (
          <button className="btn btn-primary" disabled>
            ⏳ Assessing...
          </button>
        )}
        {phase.stage === 'phase1_complete' && assessment?.canProceed && (
          <button className="btn btn-primary" onClick={handleContinueArchitecture}>
            Continue to Architecture →
          </button>
        )}
        {phase.stage === 'phase1_complete' && !assessment?.canProceed && (
          <button className="btn btn-secondary" onClick={handleReset}>
            Revise Project Scope
          </button>
        )}
        <button className="btn btn-danger" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  // Render Phase 2: Architecture View
  const renderPhase2View = () => (
    <div className="phase-view">
      <h3>Phase 2: Architecture Design</h3>
      <p className="phase-description">
        AI is designing the system architecture, selecting technologies, and planning the directory structure.
      </p>
      
      {architecture && (
        <div className="architecture-result">
          <div className="architecture-content">
            <h4>System Architecture</h4>
            <div className="markdown-content" dangerouslySetInnerHTML={{ 
              __html: architecture.architecture.replace(/\n/g, '<br/>') 
            }} />
          </div>
          
          <div className="directory-structure">
            <h4>Directory Structure</h4>
            <pre className="tree-view">{architecture.directoryStructure}</pre>
          </div>
          
          <div className="tech-stack">
            <h4>Technology Stack</h4>
            <div className="tech-grid">
              {architecture.techStack.map((tech, i) => (
                <div key={i} className="tech-card">
                  <span className="tech-name">{tech.name}</span>
                  {tech.version && <span className="tech-version">{tech.version}</span>}
                  <span className={`tech-category ${tech.category}`}>{tech.category}</span>
                  <span className="tech-purpose">{tech.purpose}</span>
                </div>
              ))}
            </div>
          </div>
          
          {architecture.patterns.length > 0 && (
            <div className="patterns">
              <h4>Design Patterns</h4>
              <div className="pattern-tags">
                {architecture.patterns.map((p, i) => (
                  <span key={i} className="pattern-tag">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="phase-actions">
        {phase.stage === 'phase2_architecture' && (
          <button className="btn btn-primary" disabled>
            🏗️ Designing...
          </button>
        )}
        {phase.stage === 'phase2_complete' && (
          <>
            <button className="btn btn-primary" onClick={handleContinueManifest}>
              Continue to File List →
            </button>
            <button className="btn btn-secondary" onClick={handleContinueArchitecture}>
              ← Redesign
            </button>
          </>
        )}
        <button className="btn btn-danger" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  // Render Phase 3: Manifest View
  const renderPhase3View = () => (
    <div className="phase-view">
      <h3>Phase 3: File Manifest</h3>
      <p className="phase-description">
        AI is listing all files that will be generated. Review the complete file structure before code generation begins.
      </p>
      
      {manifest && (
        <div className="manifest-result">
          <div className="manifest-summary">
            <div className="summary-stat">
              <span className="stat-value">{manifest.files.length}</span>
              <span className="stat-label">Files</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{manifest.totalEstimatedLines.toLocaleString()}</span>
              <span className="stat-label">Lines of Code</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{manifest.fileGroups.length}</span>
              <span className="stat-label">Categories</span>
            </div>
          </div>
          
          <div className="file-groups">
            {manifest.fileGroups.map((group, i) => (
              <div key={i} className="file-group">
                <h4>{group.name} ({group.files.length} files, ~{group.totalLines} lines)</h4>
                <ul className="file-list">
                  {group.files.map((file, j) => (
                    <li key={j} className={`file-item ${file.isCore ? 'core' : ''}`}>
                      <span className="file-path">{file.path}</span>
                      <span className="file-desc">{file.description}</span>
                      {file.isCore && <span className="core-badge" title="Core file">⭐</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="phase-actions">
        {phase.stage === 'phase3_manifest' && (
          <button className="btn btn-primary" disabled>
            📋 Planning...
          </button>
        )}
        {phase.stage === 'phase3_complete' && (
          <>
            <button className="btn btn-primary" onClick={handleStartCodegen}>
              💻 Start Code Generation →
            </button>
            <button className="btn btn-secondary" onClick={handleContinueManifest}>
              ← Revise List
            </button>
          </>
        )}
        <button className="btn btn-danger" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  // Render Phase 4: Code Generation View
  const renderPhase4View = () => (
    <div className="phase-view">
      <h3>Phase 4: Code Generation</h3>
      <p className="phase-description">
        AI is generating each file's complete content one at a time. You can pause or stop at any point.
      </p>
      
      {codegenProgress && (
        <div className="codegen-progress">
          <div className="progress-header">
            <div className="progress-info">
              <span className="current-file">
                Generating: <strong>{codegenProgress.currentFile.path}</strong>
              </span>
              <span className="progress-count">
                {codegenProgress.currentIndex + 1} / {codegenProgress.totalFiles}
              </span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${((codegenProgress.currentIndex + 1) / codegenProgress.totalFiles) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="file-details">
            <div className="file-info">
              <span className="info-label">Category:</span>
              <span className="info-value">{codegenProgress.currentFile.category}</span>
              <span className="info-label">Est. Lines:</span>
              <span className="info-value">{codegenProgress.currentFile.estimatedLines}</span>
            </div>
            <div className="file-description">
              {codegenProgress.currentFile.description}
            </div>
          </div>
          
          {codegenProgress.status === 'generating' && (
            <div className="generating-indicator">
              <span className="spinner">⏳</span>
              <span>Generating content...</span>
            </div>
          )}
          
          {codegenProgress.completedFiles.length > 0 && (
            <div className="completed-files">
              <h4>✅ Completed Files ({codegenProgress.completedFiles.length})</h4>
              <div className="completed-list">
                {codegenProgress.completedFiles.slice(-5).map((f, i) => (
                  <span key={i} className="completed-file-tag">{f.path}</span>
                ))}
                {codegenProgress.completedFiles.length > 5 && (
                  <span className="more-tag">+{codegenProgress.completedFiles.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="phase-actions">
        {phase.stage === 'phase4_codegen' && (
          <>
            {paused ? (
              <button className="btn btn-primary" onClick={resume}>
                ▶️ Resume
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={pause}>
                ⏸️ Pause
              </button>
            )}
            <button className="btn btn-danger" onClick={cancel}>
              ⏹️ Stop
            </button>
          </>
        )}
        {phase.stage === 'phase4_complete' && (
          <>
            <button className="btn btn-primary" onClick={handleBuildProject}>
              🚀 Build & Push to GitHub
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              Start Over
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Render initial setup form
  const renderSetupForm = () => (
    <div className="builder-setup">
      {!activeProjectPath && (
        <div className="form-group">
          <label>Project Name</label>
          <input
            className="input"
            placeholder="my-awesome-project"
            value={projectName}
            onChange={e => setProjectName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
          />
        </div>
      )}

      {!activeProjectPath && (
        <>
          <div className="form-group">
            <label>Description</label>
            <input
              className="input"
              placeholder="A brief description of what this project does"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="mode-toggle">
            <button className={`mode-btn ${mode === 'template' ? 'active' : ''}`} onClick={() => setMode('template')}>
              📋 From Template
            </button>
            <button className={`mode-btn ${mode === 'freeform' ? 'active' : ''}`} onClick={() => setMode('freeform')}>
              🤖 AI Freeform
            </button>
          </div>

          {mode === 'template' && (
            <div className="template-grid">
              {templates.map(t => (
                <div
                  key={t.id}
                  className={`template-card ${selectedTemplate === t.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(t.id)}
                >
                  <div className="template-name">{t.name}</div>
                  <div className="template-lang">{t.language}</div>
                  <div className="template-desc">{t.description}</div>
                  <div className="template-tags">
                    {t.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="form-group">
        <label>
          {mode === 'freeform' && !activeProjectPath ? 'Describe what you want built' : 'Project requirements'}
        </label>
        <textarea
          className="textarea"
          rows={6}
          placeholder={
            mode === 'freeform' && !activeProjectPath
              ? 'e.g. A REST API with authentication, SQLite database, and CRUD endpoints'
              : 'e.g. Use TypeScript, add dark mode, implement caching...'
          }
          value={freeformPrompt}
          onChange={e => setFreeformPrompt(e.target.value)}
          style={{ fontSize: '15px', lineHeight: '1.5' }}
        />
      </div>

      {skills.length > 0 && (
        <div className="form-group">
          <label>Loadable Skills</label>
          <div className="skills-grid">
            {skills.map(skill => (
              <div
                key={skill.id}
                className={`skill-chip ${selectedSkills.has(skill.id) ? 'active' : ''}`}
                onClick={() => {
                  const newSkills = new Set(selectedSkills);
                  if (newSkills.has(skill.id)) newSkills.delete(skill.id);
                  else newSkills.add(skill.id);
                  setSelectedSkills(newSkills);
                }}
                title={skill.description}
              >
                <span className="skill-name">{skill.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeProjectPath && (
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Output Directory</label>
            <input
              className="input"
              value={outputDir}
              onChange={e => setOutputDir(e.target.value)}
              placeholder="C:\Users\Projects"
            />
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
            Private repo
          </label>
        </div>
      )}

      {modelLocation?.found && (
        <div className="model-status">
          <span>✅ Model: <strong>{modelLocation.model}</strong></span>
        </div>
      )}

      {!modelLocation?.found && (
        <div className="warning-box">
          ⚠️ No AI model found. Please install Ollama and pull a model.
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleStartAssessment}
        disabled={!modelLocation?.found || (!projectName && !activeProjectPath)}
        style={{ marginTop: '16px' }}
      >
        🚀 Start 4-Phase Generation
      </button>
    </div>
  );

  return (
    <div className="panel phased-builder">
      <div className="panel-header">
        <h1>{activeProjectPath ? `🛠️ Modifying Project` : `🏗️ Phased Project Builder`}</h1>
        <p>
          {activeProjectPath
            ? 'AI-powered code modifications with full context awareness'
            : 'Generate production-ready code through structured 4-phase process'}
        </p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {renderPhaseIndicator()}

      {/* Render current phase view or setup form */}
      {phase.stage === 'idle' && renderSetupForm()}
      {phase.stage === 'phase1_assessment' && renderPhase1View()}
      {phase.stage === 'phase1_complete' && renderPhase1View()}
      {phase.stage === 'phase2_architecture' && renderPhase2View()}
      {phase.stage === 'phase2_complete' && renderPhase2View()}
      {phase.stage === 'phase3_manifest' && renderPhase3View()}
      {phase.stage === 'phase3_complete' && renderPhase3View()}
      {phase.stage === 'phase4_codegen' && renderPhase4View()}
      {phase.stage === 'phase4_complete' && renderPhase4View()}
      {phase.stage === 'ready_to_build' && (
        <div className="ready-state">
          <h3>✅ Generation Complete!</h3>
          <p>All {generatedFiles.length} files have been generated successfully.</p>
          <button className="btn btn-primary" onClick={handleBuildProject}>
            🚀 Build & Push to GitHub
          </button>
        </div>
      )}
      {(phase.stage === 'cancelled' || phase.stage === 'error') && (
        <div className="error-state">
          <h3>{phase.stage === 'cancelled' ? '⏹️ Cancelled' : '❌ Error'}</h3>
          <p>
            {phase.stage === 'cancelled' 
              ? 'Generation was cancelled by user.' 
              : 'An error occurred during generation.'}
          </p>
          {phase.stage === 'error' && <p className="error-detail">{/* error detail */}</p>}
          <button className="btn btn-primary" onClick={handleReset}>
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
