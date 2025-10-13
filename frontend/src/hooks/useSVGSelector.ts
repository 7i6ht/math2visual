import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { generationService } from '@/api_services/generation';
import type { ComponentMapping } from '@/types/visualInteraction';
import type { ParsedOperation } from '@/utils/dsl-parser';
import { useHighlightingContext } from '@/contexts/HighlightingContext';
import { useDSLContext } from '@/contexts/DSLContext';

interface SVGSelectorState {
  isOpen: boolean;
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
    componentMappings: ComponentMapping;
    parsedDSL: ParsedOperation;
  }) => void;
}

export const useSVGSelector = ({
  onVisualsUpdate,
}: UseSVGSelectorProps) => {
  // Use highlighting context
  const { setSelectedElement, clearHighlighting } = useHighlightingContext();
  const { formattedDSL, componentMappings } = useDSLContext();

  const [selectorState, setSelectorState] = useState<SVGSelectorState>({
    isOpen: false,
    dslPath: '',
    currentValue: '',
  });

  // Close the selector and clear highlight
  const closeSelector = useCallback(() => {
    // Reset currentDSLPath to clear highlight
    clearHighlighting();
    
    setSelectorState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, [clearHighlighting]);

  // Open the selector at a specific position for a specific DSL path
  const openSelector = useCallback((event: MouseEvent) => {    
    // Find the correct SVG element using closest() method
    // This ensures we get the actual SVG element with data-dsl-path, not a child element
    const el = event.target as Element;
    const targetEl = el.closest('svg[data-dsl-path]') as Element;
    const dslPath = targetEl.getAttribute('data-dsl-path') || '';
    const normalizedDslPath = dslPath.endsWith("]") ? dslPath.slice(0, dslPath.lastIndexOf("[")) : dslPath;

    // Trigger highlight via existing system
    setSelectedElement(targetEl);

    const typeMapping = componentMappings?.[normalizedDslPath];
    const currentValue = typeMapping?.property_value || "";

    setSelectorState({
      isOpen: true,
      dslPath: normalizedDslPath,
      currentValue,
    });
  }, [setSelectedElement, componentMappings]);

  // Handle embedded SVG change
  const updateEmbeddedSVG = useCallback(async (newType: string) => {
    if (!formattedDSL || !selectorState.currentValue) {
      toast.error('No DSL or path context available');
      return;
    }

    try {
      const loadingToastId = toast.loading('Updating SVG and regenerating visuals...');
      
      // Use regex to replace all occurrences of the old type with the new type
      const updatedDSL = replaceEntityTypeInDSL(formattedDSL, selectorState.currentValue, newType, selectorState.dslPath);

      // Generate new visuals with updated DSL
      const abortController = new AbortController();
      const data = await generationService.generateFromDSL(updatedDSL, abortController.signal);

      // Update the application state with new results
      onVisualsUpdate({
        visual_language: data.visual_language,
        svg_formal: data.svg_formal,
        svg_intuitive: data.svg_intuitive,
        formal_error: data.formal_error ?? null,
        intuitive_error: data.intuitive_error ?? null,
        missing_svg_entities: data.missing_svg_entities || [],
        componentMappings: data.componentMappings || {},
        parsedDSL: data.parsedDSL!,
      });

      // Dismiss the loading toast and show success
      toast.dismiss(loadingToastId);
      toast.success("Successfully updated SVG");
      
      // Close the selector (this will also clear the highlight)
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
  }, [formattedDSL, selectorState.currentValue, selectorState.dslPath, onVisualsUpdate, closeSelector]);

  return {
    selectorState,
    openSelector,
    closeSelector,
    updateEmbeddedSVG,
  };
};

/**
 * Replace all occurrences of an entity type in DSL string using regex
 * Uses the DSL path to determine whether to match entity_type, container_type, or attr_type
 */
function replaceEntityTypeInDSL(dsl: string, oldType: string, newType: string, dslPath: string): string {
  if (!dsl || !oldType || !newType || !dslPath) {
    return dsl;
  }

  // Determine the type pattern based on DSL path
  let typePattern: string;
  if (dslPath.endsWith('container_type')) {
    typePattern = 'container_type';
  } else if (dslPath.endsWith('attr_type')) {
    typePattern = 'attr_type';
  } else {
    typePattern = 'entity_type';
  }
  
  // Pattern to match the specific type: value pattern
  // Using word boundaries to avoid partial replacements
  const pattern = new RegExp(`(${typePattern}\\s*:\\s*)${escapeRegex(oldType)}(\\b)`, 'g');
  const replacement = `$1${newType}$2`;
  
  const updatedDSL = dsl.replace(pattern, replacement);
  
  // Check if any replacements were made
  if (updatedDSL === dsl) {
    throw new Error(`Could not find ${typePattern} '${oldType}' in DSL`);
  }
  
  return updatedDSL;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
