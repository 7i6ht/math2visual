import { useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { AppState as AppState } from "@/types";
import type { ComponentMapping } from "@/types/visualInteraction";
import type { ParsedOperation } from "@/utils/dsl-parser";
import { useDSLContext } from "@/contexts/DSLContext";
import { generationService as service } from "@/api_services/generation";
import { useAnalytics } from "@/hooks/useAnalytics";

export const useAppState = () => {
  const { setGenerationResult, formattedDSL } = useDSLContext();
  const currentGenerationId = useRef<string | null>(null);
  const generationStartTime = useRef<number | null>(null);
  const { trackGenerationStart, trackGenerationComplete, isAnalyticsEnabled } = useAnalytics();
  const [state, setState] = useState<AppState>({
    mpFormLoading: false,
    vlFormLoading: false,
    svgFormal: null,
    svgIntuitive: null,
    formalError: null,
    intuitiveError: null,
    currentAbortFunction: undefined,
    missingSVGEntities: [],
    uploadGenerating: false,
    uploadedEntities: [],
    hasCompletedGeneration: false,
    mwp: "",
    formula: "",
    hint: "",
    showHint: false,
  });

  const setMpFormLoading = useCallback((mpFormLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      mpFormLoading,
      currentAbortFunction: mpFormLoading ? abortFn : undefined
    }));
  }, []);

  const setVLFormLoading = useCallback((vlFormLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      vlFormLoading,
      currentAbortFunction: vlFormLoading ? abortFn : undefined
    }));
  }, []);

  const setResults = useCallback((
    vl: string,
    svgFormal: string | null,
    svgIntuitive: string | null,
    parsedDSL: ParsedOperation,
    formalError?: string | null,
    intuitiveError?: string | null,
    missingSvgEntities?: string[],
    mwp?: string,
    formula?: string,
    componentMappings?: ComponentMapping
  ) => {
    setState(prev => ({
      ...prev,
      svgFormal,
      svgIntuitive,
      formalError: formalError || null,
      intuitiveError: intuitiveError || null,
      missingSVGEntities: missingSvgEntities|| [],
      hasCompletedGeneration: true,
      ...(mwp !== undefined && { mwp }),
      ...(formula !== undefined && { formula }),
    }));

    // Also update DSL context so consumers can read formatted DSL, mappings, and parsed AST
    setGenerationResult({
      visual_language: vl,
      ...(componentMappings && { componentMappings }),
      parsedDSL,
    });

    // Track generation completion
    if (isAnalyticsEnabled) {
      const success = !!(svgFormal || svgIntuitive);
      const endTime = Date.now();
      const totalTime = generationStartTime.current ? endTime - generationStartTime.current : undefined;
      
      trackGenerationComplete(
        currentGenerationId.current,
        success,
        vl,
        [formalError, intuitiveError].filter(Boolean),
        missingSvgEntities,
        {
          total: totalTime,
          dsl: totalTime ? Math.floor(totalTime * 0.6) : undefined, // Estimate DSL time
          visual: totalTime ? Math.floor(totalTime * 0.4) : undefined, // Estimate visual time
        }
      );
    }

    // Reset generation tracking
    currentGenerationId.current = null;
    generationStartTime.current = null;
  }, [setGenerationResult]);

  const resetResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      svgFormal: null,
      svgIntuitive: null,
      formalError: null,
      intuitiveError: null,
      missingSVGEntities: [],
    }));
  }, []);

  const setUploadGenerating = useCallback((uploadGenerating: boolean) => {
    setState(prev => ({ ...prev, uploadGenerating }));
  }, []);

  const clearMissingSVGEntities = useCallback(() => {
    setState(prev => ({ ...prev, missingSVGEntities: [] }));
  }, []);

  const handleRegenerateAfterUpload = useCallback(async (toastId: string | undefined) => {
    const generateToastId = toastId || `generate-${Date.now()}`;

    if (!formattedDSL) {
      toast.warning('No visual language available for regeneration');
      return;
    }
    
    try {
      setUploadGenerating(true);
      toast.loading('Regenerating visualizations...', { id: generateToastId });
      
      const result = await service.generateFromDSL(formattedDSL);
      
      setResults(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.parsedDSL!,
        result.formal_error,
        result.intuitive_error,
        result.missing_svg_entities,
        undefined,
        undefined,
        result.componentMappings
      );
      
      // Check if regeneration was successful
      if (result.svg_formal || result.svg_intuitive) {
        toast.success('Visualizations generated successfully', { id: generateToastId });
      } else if (result.missing_svg_entities && result.missing_svg_entities.length > 0) {
        toast.warning('Another SVG file is still missing', { 
          id: generateToastId,
          description: `Missing: ${result.missing_svg_entities[0]}` 
        });
      } else {
        toast.error('Generation failed', { 
          id: generateToastId,
          description: 'Unable to generate visualizations' 
        });
      }
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      toast.error(errorMessage, { 
        id: generateToastId,
        description: 'Failed to regenerate visualizations'
      });
    } finally {
      setUploadGenerating(false);
    }
  }, [formattedDSL, setResults, setUploadGenerating]);

  const saveInitialValues = useCallback(async (mwp: string, formula: string, hint: string) => {
    setState(prev => ({
      ...prev,
      mwp: mwp,
      formula: formula,
      hint: hint,
    }));

    // Track generation start
    if (isAnalyticsEnabled) {
      currentGenerationId.current = await trackGenerationStart(mwp, formula, hint);
      generationStartTime.current = Date.now();
    }
  }, []);

  const setShowHint = useCallback((showHint: boolean) => {
    setState(prev => ({ ...prev, showHint }));
  }, []);


  const handleAbort = useCallback(() => {
    // Call the current abort function if it exists
    if (state.currentAbortFunction) {
      state.currentAbortFunction();
    }
    
    // Reset to initial layout while preserving MWP and formula values
    setState(prev => ({
      ...prev,
      mpFormLoading: false,
      vlFormLoading: false,
      currentAbortFunction: undefined,
      // Keep mwp and formula values intact
    }));

    toast.info('Generation cancelled');
  }, [state]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    ...state,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    setUploadGenerating,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    saveInitialValues,
    setShowHint,
  }), [
    state,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    setUploadGenerating,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    saveInitialValues,
    setShowHint,
  ]);

  return returnValue;
};