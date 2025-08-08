import { useState } from "react";
import { toast } from "sonner";
import type { PageState } from "@/types";

export const useAppState = () => {
  const [state, setState] = useState<PageState>({
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
  });

  const setMpFormLoading = (mpFormLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      mpFormLoading,
      currentAbortFunction: mpFormLoading ? abortFn : undefined
    }));
  };

  const setVLFormLoading = (vlFormLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      vlFormLoading,
      currentAbortFunction: vlFormLoading ? abortFn : undefined
    }));
  };

  const setResults = (
    vl: string,
    svgFormal: string | null,
    svgIntuitive: string | null,
    formalError?: string | null,
    intuitiveError?: string | null,
    missingSvgEntities?: string[]
  ) => {
    setState(prev => ({
      ...prev,
      vl,
      svgFormal,
      svgIntuitive,
      formalError: formalError || null,
      intuitiveError: intuitiveError || null,
      missingSVGEntities: missingSvgEntities|| [],
    }));
  };

  const resetResults = () => {
    setState(prev => ({
      ...prev,
      vl: null,
      svgFormal: null,
      svgIntuitive: null,
      formalError: null,
      intuitiveError: null,
      missingSVGEntities: [],
    }));
  };

  const resetVisuals = () => {
    setState(prev => ({
      ...prev,
      svgFormal: null,
      svgIntuitive: null,
      formalError: null,
      intuitiveError: null,
      missingSVGEntities: [],
    }));
  };

  const setUploadGenerating = (uploadGenerating: boolean) => {
    setState(prev => ({ ...prev, uploadGenerating }));
  };

  const clearMissingSVGEntities = () => {
    setState(prev => ({ ...prev, missingSVGEntities: [] }));
  };

  const handleRegenerateAfterUpload = async (toastId: string | undefined) => {
    const generateToastId = toastId || `generate-${Date.now()}`;

    if (!state.vl) {
      toast.warning('No visual language available for regeneration');
      return;
    }
    
    try {
      setUploadGenerating(true);
      resetVisuals();
      toast.loading('Regenerating visualizations...', { id: generateToastId });
      
      const { default: apiService } = await import('@/services/api');
      const result = await apiService.generateFromDSL(state.vl);
      
      setResults(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.formal_error,
        result.intuitive_error,
        result.missing_svg_entities
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
  };

  return {
    ...state,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    resetVisuals,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
  };
}; 