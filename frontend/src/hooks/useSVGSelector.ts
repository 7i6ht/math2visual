import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { generationService } from '@/api_services/generation';
import type { ComponentMapping } from '@/types/visualInteraction';

interface SVGSelectorState {
  isOpen: boolean;
  position: { x: number; y: number };
  dslPath: string;
  currentValue: string;
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
  const [selectorState, setSelectorState] = useState<SVGSelectorState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    dslPath: '',
    currentValue: '',
  });

  // Close the selector
  const closeSelector = useCallback(() => {
    setSelectorState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Open the selector at a specific position for a specific DSL path
  const openSelector = useCallback((dslPath: string, currentValue: string, event: MouseEvent) => {
    // Calculate position relative to viewport
    const x = event.clientX;
    const y = event.clientY;
    
    setSelectorState({
      isOpen: true,
      position: { x, y },
      dslPath: dslPath,
      currentValue,
    });
  }, []);

  // Handle embedded SVG change
  const handleEmbeddedSVGChange = useCallback(async (newType: string) => {
    if (!currentDSL) {
      toast.error('No DSL available for update');
      return;
    }

    if (!selectorState.dslPath) {
      toast.error('No DSL path context available');
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
      
      // Close the selector
      closeSelector();
    } catch (error) {
      console.error('Embedded SVG change failed:', error);
      // Dismiss any loading toast that might still be showing
      toast.dismiss();
      toast.error(
        error instanceof Error ? error.message : 'Failed to update SVG'
      );
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
