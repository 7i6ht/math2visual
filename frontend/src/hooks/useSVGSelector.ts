import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { generationService } from '@/api_services/generation';
import type { ComponentMapping } from '@/types/visualInteraction';

interface SVGSelectorState {
  isOpen: boolean;
  position: { x: number; y: number };
  currentEntityType: string;
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
  componentMappings?: ComponentMapping;
}

export const useSVGSelector = ({
  onVisualsUpdate,
  currentDSL,
  componentMappings,
}: UseSVGSelectorProps) => {
  const [selectorState, setSelectorState] = useState<SVGSelectorState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    currentEntityType: '',
  });

  // Close the selector
  const closeSelector = useCallback(() => {
    setSelectorState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Open the selector at a specific position for a specific entity type
  const openSelector = useCallback((entityType: string, event: MouseEvent) => {
    // Calculate position relative to viewport
    const x = event.clientX;
    const y = event.clientY;
    
    setSelectorState({
      isOpen: true,
      position: { x, y },
      currentEntityType: entityType,
    });
  }, []);

  // Handle entity type change
  const handleEntityTypeChange = useCallback(async (oldType: string, newType: string) => {
    if (!currentDSL) {
      toast.error('No DSL available for update');
      return;
    }

    try {
      const loadingToastId = toast.loading('Updating SVG and regenerating visuals...');
      
      const result = await generationService.updateEntityType(currentDSL, oldType, newType);
      
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
      console.error('Entity type change failed:', error);
      // Dismiss any loading toast that might still be showing
      toast.dismiss();
      toast.error(
        error instanceof Error ? error.message : 'Failed to update SVG'
      );
      throw error; // Re-throw so the popup can handle it
    }
  }, [currentDSL, onVisualsUpdate, closeSelector]);

  // Handle embedded SVG click
  const handleEmbeddedSVGClick = useCallback((dslPath: string, event: MouseEvent) => {
    // Extract entity type from DSL path
    // The DSL path should be something like "entities[0]/entity_type" or similar
    // We need to find the actual entity type value from the current DSL
    
    let entityTypeFromMapping: string | undefined;
    if (componentMappings) {
      const basePath = dslPath.replace(/\/entity_type(\[\d+\])?$/, '/entity_type');
      entityTypeFromMapping = componentMappings[basePath]?.property_value;
    }

    if (entityTypeFromMapping) {
      openSelector(entityTypeFromMapping, event);
      return;
    }
    
    toast.error('Could not determine entity type from DSL');
  }, [currentDSL, openSelector]);

  return {
    selectorState,
    openSelector,
    closeSelector,
    handleEntityTypeChange,
    handleEmbeddedSVGClick,
  };
};
