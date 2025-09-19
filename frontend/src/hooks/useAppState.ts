import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { AppState as AppState } from "@/types";
import type { ComponentMapping } from "@/types/visualInteraction";

export const useAppState = () => {
  const [state, setState] = useState<AppState>({
    vl: null,
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
    componentMappings: {},
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
    formalError?: string | null,
    intuitiveError?: string | null,
    missingSvgEntities?: string[],
    mwp?: string,
    formula?: string,
    componentMappings?: ComponentMapping
  ) => {
    setState(prev => ({
      ...prev,
      vl,
      svgFormal,
      svgIntuitive,
      formalError: formalError || null,
      intuitiveError: intuitiveError || null,
      missingSVGEntities: missingSvgEntities|| [],
      hasCompletedGeneration: true,
      ...(mwp !== undefined && { mwp }),
      ...(formula !== undefined && { formula }),
      ...(componentMappings !== undefined && { componentMappings }),
    }));
  }, []);

  const resetResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      vl: null,
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

    if (!state.vl) {
      toast.warning('No visual language available for regeneration');
      return;
    }
    
    try {
      setUploadGenerating(true);
      toast.loading('Regenerating visualizations...', { id: generateToastId });
      
      const { default: service } = await import('@/api_services/generation');
      const result = await service.generateFromDSL(state.vl);
      
      setResults(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
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
  }, [state.vl, setResults]);

  const saveInitialValues = useCallback((mwp: string, formula: string) => {
    setState(prev => ({
      ...prev,
      mwp: mwp,
      formula: formula,
    }));
  }, []);

  const handleAbort = useCallback(() => {
    // Call the current abort function if it exists
    if (state.currentAbortFunction) {
      state.currentAbortFunction();
    }
    
    // Reset to initial layout while preserving MWP and formula values
    setState(prev => ({
      ...prev,
      hasCompletedGeneration: false,
      mpFormLoading: false,
      vlFormLoading: false,
      currentAbortFunction: undefined,
      // Keep mwp and formula values intact
    }));

    toast.info('Generation cancelled');
  }, [state.currentAbortFunction]);

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
  ]);

  return returnValue;
};