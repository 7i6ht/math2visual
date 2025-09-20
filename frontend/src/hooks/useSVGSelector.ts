import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { generationService } from '@/api_services/generation';
import type { ComponentMapping } from '@/types/visualInteraction';
import { useHighlightingContext } from '@/contexts/HighlightingContext';

interface SVGSelectorState {
  isOpen: boolean;
  dslPath: string;
  currentValue: string;
  targetElement: Element | null;
}

interface UseSVGSelectorProps {
  onVisualsUpdate: (data: {
    visual_language: string;
    svg_formal: string | null;
    svg_intuitive: string | null;
    formal_error: string | null;
    intuitive_error: string | null;
    missing_svg_entities: string[];
    componentMappings?: ComponentMapping;
  }) => void;
  currentDSL: string;
}

export const useSVGSelector = ({
  onVisualsUpdate,
  currentDSL,
}: UseSVGSelectorProps) => {
  // Use highlighting context
  const { setCurrentDSLPath } = useHighlightingContext();

  const [selectorState, setSelectorState] = useState<SVGSelectorState>({
    isOpen: false,
    dslPath: '',
    currentValue: '',
    targetElement: null,
  });

  // Close the selector and clear highlight
  const closeSelector = useCallback(() => {
    console.log('🎯 [closeSelector] START');
    // Reset currentDSLPath to clear highlight
    setCurrentDSLPath(null);
    
    setSelectorState(prev => ({
      ...prev,
      isOpen: false,
      targetElement: null,
    }));
    console.log('🎯 [closeSelector] END');
  }, [setCurrentDSLPath]);

  // Open the selector at a specific position for a specific DSL path
  const openSelector = useCallback((dslPath: string, currentValue: string, event: MouseEvent) => {
    console.log('🎯 [openSelector] START', { dslPath, currentValue, event });
    
    // Set currentDSLPath to trigger highlight via existing system
    setCurrentDSLPath(dslPath);
    
    // Set selector state
    setSelectorState({
      isOpen: true,
      dslPath: dslPath,
      currentValue,
      targetElement: event.target as Element,
    });
    console.log('🎯 [openSelector] END');
  }, [setCurrentDSLPath]);

  // Handle embedded SVG change
  const handleEmbeddedSVGChange = useCallback(async (newType: string) => {
    console.log('🎯 [handleEmbeddedSVGChange] START', { newType });
    if (!currentDSL) {
      toast.error('No DSL available for update');
      console.log('🎯 [handleEmbeddedSVGChange] END (early return - no currentDSL)');
      return;
    }

    if (!selectorState.dslPath) {
      toast.error('No DSL path context available');
      console.log('🎯 [handleEmbeddedSVGChange] END (early return - no dslPath)');
      return;
    }

    try {
      const loadingToastId = toast.loading('Updating SVG and regenerating visuals...');
      
      const result = await generationService.updateEmbeddedSVG(currentDSL, selectorState.currentValue, newType);
      
      // Update the visuals with the new data, including updated component mappings
      onVisualsUpdate({
        visual_language: result.visual_language,
        svg_formal: result.svg_formal,
        svg_intuitive: result.svg_intuitive,
        formal_error: result.formal_error,
        intuitive_error: result.intuitive_error,
        missing_svg_entities: result.missing_svg_entities,
        componentMappings: result.componentMappings,
      });

      // Dismiss the loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success(
        "Successfully updated SVG"
      );
      
      // Close the selector (this will also clear the highlight)
      closeSelector();
      console.log('🎯 [handleEmbeddedSVGChange] END (success)');
    } catch (error) {
      console.error('Embedded SVG change failed:', error);
      // Dismiss any loading toast that might still be showing
      toast.dismiss();
      toast.error(
        error instanceof Error ? error.message : 'Failed to update SVG'
      );
      console.log('🎯 [handleEmbeddedSVGChange] END (error)');
      throw error; // Re-throw so the popup can handle it
    }
  }, [currentDSL, selectorState.currentValue, selectorState.dslPath, onVisualsUpdate, closeSelector]);

  return {
    selectorState,
    openSelector,
    closeSelector,
    handleEmbeddedSVGChange,
  };
};
