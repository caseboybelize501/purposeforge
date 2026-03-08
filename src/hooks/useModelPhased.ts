import { useState, useCallback, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { locateModel, modelGenerate } from '../lib/api';
import type { ModelLocation } from '../types';
import type {
  GenerationPhase,
  PhasedGenerationContext,
  AssessmentResult,
  ArchitectureResult,
  ManifestResult,
  ManifestFile,
  GeneratedFile,
  Phase4Progress,
} from '../types';
import {
  buildPhase1Prompt,
  buildPhase2Prompt,
  buildPhase3Prompt,
  buildPhase4Prompt,
  parsePhase1Response,
  parsePhase2Response,
  parsePhase3Response,
  parsePhase4Response,
} from '../lib/phased-prompts';

interface UseModelPhasedReturn {
  // Existing API (for backward compatibility)
  location: ModelLocation | null;
  scanning: boolean;
  generating: boolean;
  streamedText: string;
  scan: () => Promise<ModelLocation | null>;
  generate: (
    prompt: string,
    system?: string,
    onToken?: (token: string) => void,
    projectPath?: string | null,
    contextFiles?: string[] | null,
  ) => Promise<string>;

  // New Phased API
  phased: {
    // State
    phase: GenerationPhase;
    context: PhasedGenerationContext | null;
    assessment: AssessmentResult | null;
    architecture: ArchitectureResult | null;
    manifest: ManifestResult | null;
    generatedFiles: GeneratedFile[];
    codegenProgress: Phase4Progress | null;
    error: string | null;
    paused: boolean;
    cancelled: boolean;

    // Phase control
    startPhase1: (context: PhasedGenerationContext) => Promise<AssessmentResult>;
    continuePhase2: () => Promise<ArchitectureResult>;
    continuePhase3: () => Promise<ManifestResult>;
    continuePhase4: (
      onFileComplete?: (file: GeneratedFile) => void,
      onProgress?: (progress: Phase4Progress) => void
    ) => Promise<GeneratedFile[]>;
    
    // File-by-file generation (for Phase 4)
    generateSingleFile: (file: ManifestFile) => Promise<GeneratedFile>;
    
    // Control
    pause: () => void;
    resume: () => void;
    cancel: () => void;
    reset: () => void;
    
    // Retry
    retryPhase4File: (file: ManifestFile) => Promise<GeneratedFile>;
  };
}

/**
 * Enhanced useModel hook with phased code generation support
 */
export function useModelPhased(): UseModelPhasedReturn {
  // Existing state
  const [location, setLocation] = useState<ModelLocation | null>(null);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const unlistenRef = useRef<(() => void) | null>(null);

  // Phased generation state
  const [phase, setPhase] = useState<GenerationPhase>({ stage: 'idle' });
  const [context, setContext] = useState<PhasedGenerationContext | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [architecture, setArchitecture] = useState<ArchitectureResult | null>(null);
  const [manifest, setManifest] = useState<ManifestResult | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [codegenProgress, setCodegenProgress] = useState<Phase4Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // Pause/resume refs
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const pauseCheckInterval = useRef<number | null>(null);

  // Scan for model
  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const loc = await locateModel();
      setLocation(loc);
      return loc;
    } catch (e) {
      console.error('Model scan failed:', e);
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  // Auto-scan on mount
  useEffect(() => { scan(); }, [scan]);

  // Existing generate function (for backward compatibility)
  const generate = useCallback(async (
    prompt: string,
    system?: string,
    onToken?: (token: string) => void,
    projectPath?: string | null,
    contextFiles?: string[] | null,
  ): Promise<string> => {
    if (!location?.found) throw new Error('Model not found');
    setStreamedText('');
    setGenerating(true);

    const unlisten = await listen<string>('model-token', (event) => {
      setStreamedText(prev => prev + event.payload);
      onToken?.(event.payload);
    });
    unlistenRef.current = unlisten;

    try {
      const result = await modelGenerate(location, prompt, system, projectPath, contextFiles);
      return result;
    } finally {
      unlisten();
      unlistenRef.current = null;
      setGenerating(false);
    }
  }, [location]);

  // Generic streaming generator for phased API
  const generateWithStreaming = useCallback(async (
    prompt: string,
    system: string,
    onToken?: (token: string) => void
  ): Promise<string> => {
    if (!location?.found) throw new Error('Model not found');

    const unlisten = await listen<string>('model-token', (event) => {
      setStreamedText(prev => prev + event.payload);
      onToken?.(event.payload);
    });
    unlistenRef.current = unlisten;

    try {
      const result = await modelGenerate(location, prompt, system, null, null);
      return result;
    } finally {
      unlisten();
      unlistenRef.current = null;
    }
  }, [location]);

  // Phase 1: Assessment
  const startPhase1 = useCallback(async (
    inputContext: PhasedGenerationContext
  ): Promise<AssessmentResult> => {
    setPhase({ stage: 'phase1_assessment', data: null });
    setContext(inputContext);
    setError(null);
    setCancelled(false);
    setPaused(false);
    pauseRef.current = false;
    cancelRef.current = false;

    try {
      const prompt = buildPhase1Prompt(inputContext);
      const raw = await generateWithStreaming(prompt, 'You are a software project feasibility assessor.');
      const result = parsePhase1Response(raw);

      if (!result.canProceed) {
        setPhase({ stage: 'error', data: { phase: 'Phase 1', error: 'Model determined project cannot proceed: ' + result.reasoning } });
        throw new Error('Project not feasible: ' + result.reasoning);
      }

      setAssessment(result);
      setPhase({ stage: 'phase1_complete', data: result });
      return result;
    } catch (e: any) {
      setPhase({ stage: 'error', data: { phase: 'Phase 1', error: e.message } });
      setError(e.message);
      throw e;
    }
  }, [generateWithStreaming]);

  // Phase 2: Architecture
  const continuePhase2 = useCallback(async (): Promise<ArchitectureResult> => {
    if (!context || !assessment) {
      throw new Error('Cannot continue to Phase 2: Phase 1 not complete');
    }

    setPhase({ stage: 'phase2_architecture', data: { assessment } });
    setError(null);

    try {
      const prompt = buildPhase2Prompt(context, assessment);
      const raw = await generateWithStreaming(prompt, 'You are a software architect.');
      const result = parsePhase2Response(raw);

      setArchitecture(result);
      setPhase({ stage: 'phase2_complete', data: { assessment, architecture: result } });
      return result;
    } catch (e: any) {
      setPhase({ stage: 'error', data: { phase: 'Phase 2', error: e.message } });
      setError(e.message);
      throw e;
    }
  }, [context, assessment, generateWithStreaming]);

  // Phase 3: Manifest
  const continuePhase3 = useCallback(async (): Promise<ManifestResult> => {
    if (!context || !architecture || !assessment) {
      throw new Error('Cannot continue to Phase 3: Previous phases not complete');
    }

    setPhase({ stage: 'phase3_manifest', data: { assessment, architecture } });
    setError(null);

    try {
      const prompt = buildPhase3Prompt(context, architecture, assessment);
      const raw = await generateWithStreaming(prompt, 'You are a software project planner.');
      const result = parsePhase3Response(raw);

      setManifest(result);
      setPhase({ stage: 'phase3_complete', data: { assessment, architecture, manifest: result } });
      return result;
    } catch (e: any) {
      setPhase({ stage: 'error', data: { phase: 'Phase 3', error: e.message } });
      setError(e.message);
      throw e;
    }
  }, [context, architecture, assessment, generateWithStreaming]);

  // Phase 4: Sequential Code Generation
  const continuePhase4 = useCallback(async (
    onFileComplete?: (file: GeneratedFile) => void,
    onProgress?: (progress: Phase4Progress) => void
  ): Promise<GeneratedFile[]> => {
    if (!context || !manifest) {
      throw new Error('Cannot continue to Phase 4: Phase 3 not complete');
    }

    const files = manifest.files;
    const completed: GeneratedFile[] = [];

    setPhase({ 
      stage: 'phase4_codegen', 
      data: {
        currentFile: files[0],
        currentIndex: 0,
        totalFiles: files.length,
        completedFiles: [],
        remainingFiles: files,
        status: 'generating',
        currentContent: '',
        errors: [],
      }
    });
    setCodegenProgress({
      currentFile: files[0],
      currentIndex: 0,
      totalFiles: files.length,
      completedFiles: [],
      remainingFiles: files,
      status: 'generating',
      currentContent: '',
      errors: [],
    });
    setError(null);
    setPaused(false);
    setCancelled(false);
    pauseRef.current = false;
    cancelRef.current = false;

    // Check for pause/cancel periodically
    pauseCheckInterval.current = setInterval(() => {
      if (cancelRef.current) {
        setCancelled(true);
        setPhase({ stage: 'cancelled', data: { reason: 'User cancelled', partialFiles: completed } });
        clearInterval(pauseCheckInterval.current!);
      }
      if (pauseRef.current) {
        setPaused(true);
      } else {
        setPaused(false);
      }
    }, 500);

    try {
      for (let i = 0; i < files.length; i++) {
        // Check for cancel
        if (cancelRef.current) {
          break;
        }

        // Wait if paused
        while (pauseRef.current && !cancelRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const file = files[i];

        // Update progress
        const progress: Phase4Progress = {
          currentFile: file,
          currentIndex: i,
          totalFiles: files.length,
          completedFiles: [...completed],
          remainingFiles: files.slice(i),
          status: 'generating',
          currentContent: '',
          errors: [],
        };
        setCodegenProgress(progress);
        setPhase({ stage: 'phase4_codegen', data: progress });
        onProgress?.(progress);

        // Generate this file
        try {
          const generatedFile = await generateSingleFileInternal(
            context,
            file,
            architecture!,
            manifest,
            completed
          );

          completed.push(generatedFile);
          setGeneratedFiles([...completed]);

          // Update progress
          const completedProgress: Phase4Progress = {
            currentFile: file,
            currentIndex: i,
            totalFiles: files.length,
            completedFiles: [...completed],
            remainingFiles: files.slice(i + 1),
            status: 'complete',
            currentContent: '',
            errors: [],
          };
          setCodegenProgress(completedProgress);
          onProgress?.(completedProgress);
          onFileComplete?.(generatedFile);

        } catch (fileError: any) {
          console.error(`Error generating ${file.path}:`, fileError);
          
          // Add error to progress
          const errorProgress: Phase4Progress = {
            currentFile: file,
            currentIndex: i,
            totalFiles: files.length,
            completedFiles: [...completed],
            remainingFiles: files.slice(i),
            status: 'error',
            currentContent: '',
            errors: [{
              filePath: file.path,
              error: fileError.message,
              retryable: true,
              timestamp: Date.now(),
            }],
          };
          setCodegenProgress(errorProgress);
          
          // Continue with next file (could also throw to stop)
          // throw fileError; // Uncomment to stop on first error
        }
      }

      // Cleanup
      if (pauseCheckInterval.current) {
        clearInterval(pauseCheckInterval.current);
      }

      if (cancelRef.current) {
        setPhase({ stage: 'cancelled', data: { reason: 'User cancelled', partialFiles: completed } });
      } else {
        setPhase({ stage: 'phase4_complete', data: { files: completed } });
      }

      return completed;
    } catch (e: any) {
      if (pauseCheckInterval.current) {
        clearInterval(pauseCheckInterval.current);
      }
      setPhase({ stage: 'error', data: { phase: 'Phase 4', error: e.message } });
      setError(e.message);
      throw e;
    }
  }, [context, manifest, architecture, assessment, generateWithStreaming]);

  // Internal single file generator
  const generateSingleFileInternal = useCallback(async (
    context: PhasedGenerationContext,
    file: ManifestFile,
    architecture: ArchitectureResult,
    manifest: ManifestResult,
    generatedFiles: GeneratedFile[]
  ): Promise<GeneratedFile> => {
    if (!location?.found) throw new Error('Qwen not found');

    const prompt = buildPhase4Prompt(context, file, architecture, manifest, generatedFiles);
    const raw = await generateWithStreaming(prompt, 'You are an expert code generator.');
    const result = parsePhase4Response(raw, file.path);

    return result;
  }, [location, generateWithStreaming]);

  // Public single file generator (for manual use)
  const generateSingleFile = useCallback(async (
    file: ManifestFile
  ): Promise<GeneratedFile> => {
    if (!context || !architecture || !manifest) {
      throw new Error('Cannot generate file: Phase 3 not complete');
    }
    return generateSingleFileInternal(context, file, architecture, manifest, generatedFiles);
  }, [context, architecture, manifest, generatedFiles, generateSingleFileInternal]);

  // Pause
  const pause = useCallback(() => {
    pauseRef.current = true;
  }, []);

  // Resume
  const resume = useCallback(() => {
    pauseRef.current = false;
    setPaused(false);
  }, []);

  // Cancel
  const cancel = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
  }, []);

  // Reset
  const reset = useCallback(() => {
    setPhase({ stage: 'idle' });
    setContext(null);
    setAssessment(null);
    setArchitecture(null);
    setManifest(null);
    setGeneratedFiles([]);
    setCodegenProgress(null);
    setError(null);
    setPaused(false);
    setCancelled(false);
    pauseRef.current = false;
    cancelRef.current = false;
    if (pauseCheckInterval.current) {
      clearInterval(pauseCheckInterval.current);
    }
  }, []);

  // Retry Phase 4 file
  const retryPhase4File = useCallback(async (
    file: ManifestFile
  ): Promise<GeneratedFile> => {
    if (!context || !architecture || !manifest) {
      throw new Error('Cannot retry file: Phase 3 not complete');
    }
    
    // Remove previous attempt if exists
    setGeneratedFiles(prev => prev.filter(f => f.path !== file.path));
    
    return generateSingleFileInternal(context, file, architecture, manifest, generatedFiles.filter(f => f.path !== file.path));
  }, [context, architecture, manifest, generatedFiles, generateSingleFileInternal]);

  return {
    // Existing API
    location,
    scanning,
    generating,
    streamedText,
    scan,
    generate,

    // New Phased API
    phased: {
      phase,
      context,
      assessment,
      architecture,
      manifest,
      generatedFiles,
      codegenProgress,
      error,
      paused,
      cancelled,
      startPhase1,
      continuePhase2,
      continuePhase3,
      continuePhase4,
      generateSingleFile,
      pause,
      resume,
      cancel,
      reset,
      retryPhase4File,
    },
  };
}

// Keep the old export for backward compatibility
export function useModel() {
  const { location, scanning, generating, streamedText, scan, generate } = useModelPhased();
  return { location, scanning, generating, streamedText, scan, generate };
}
