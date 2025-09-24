import { useState, useCallback } from 'react';
import { generationService } from '@/api_services/generation';
import { useDSLContext } from '@/contexts/DSLContext';
import { useHighlightingContext } from '@/contexts/HighlightingContext';
import { DSLFormatter } from '@/utils/dsl-formatter';
import type { ParsedOperation } from '@/utils/dsl-parser';
import type { ComponentMapping } from '@/types/visualInteraction';

interface ContainerNamePopupState {
  isOpen: boolean;
  dslPath: string;
}

interface UseContainerNamePopupProps {
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

export const useContainerNamePopup = ({
  onVisualsUpdate
}: UseContainerNamePopupProps) => {
  const { parsedDSL } = useDSLContext();
  const { setCurrentTargetElement, clearCurrentTargetElement } = useHighlightingContext();
  const [popupState, setPopupState] = useState<ContainerNamePopupState>({
    isOpen: false,
    dslPath: '',
  });

  /**
   * Open the container name popup
   */
  const openPopup = useCallback((dslPath: string, event: MouseEvent) => {
    // Find the correct element using closest() method
    // This ensures we get the actual element with data-dsl-path, not a child element
    const targetElement = (event.target as Element).closest('[data-dsl-path]') as Element;

    // Store target element in context
    setCurrentTargetElement(targetElement);
    
    setPopupState({
      isOpen: true,
      dslPath,
    });
  }, [setCurrentTargetElement]);

  /**
   * Close the container name popup
   */
  const closePopup = useCallback(() => {
    clearCurrentTargetElement();
    setPopupState({
      isOpen: false,
      dslPath: '',
    });
  }, [clearCurrentTargetElement]);

  /**
   * Update container name in DSL and regenerate visuals
   */
  const updateContainerName = useCallback(async (newContainerName: string) => {
    if (!parsedDSL || !popupState.dslPath) {
      throw new Error('Missing parsed DSL or DSL path');
    }

    try {
      // Update the parsed DSL object
      const updatedParsedDSL = updateContainerNameInParsedDSL(parsedDSL, popupState.dslPath, newContainerName);

      // Format the updated parsed DSL back to string
      const formatter = new DSLFormatter();
      const updatedDSL = formatter.formatWithRanges(updatedParsedDSL);

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
        parsedDSL: data.parsedDSL,
      });

    } catch (error) {
      console.error('Container name update failed:', error);
      throw error;
    }
  }, [parsedDSL, popupState.dslPath, onVisualsUpdate]);

  return {
    popupState,
    openPopup,
    closePopup,
    updateContainerName,
  };
};

/**
 * Helper to read current container name from component mappings
 */
export function getContainerNameValue(
  componentMappings: ComponentMapping | null,
  dslPath: string
): string | null {
  if (!componentMappings) return null;

  // Normalize path: ensure it ends with '/container_name'
  const normalizedPath = dslPath.endsWith('/container_name')
    ? dslPath
    : `${dslPath}/container_name`;

  const mapping = componentMappings[normalizedPath];
  return mapping?.property_value || null;
}

/**
 * Helper function to update container name value in parsed DSL object using DSL path
 */
function updateContainerNameInParsedDSL(
  parsedDSL: ParsedOperation,
  dslPath: string,
  newContainerName: string
): ParsedOperation {
  // Create a deep clone to avoid mutating the original
  const clonedDSL = JSON.parse(JSON.stringify(parsedDSL));

  // Navigate through the DSL path to find and update the target value
  const success = updateContainerNameAtPath(clonedDSL, dslPath, newContainerName);

  if (!success) {
    throw new Error(`Could not find or update container name at DSL path: ${dslPath}`);
  }

  return clonedDSL;
}

/**
 * Recursively navigate through the DSL structure using the path and update the container name
 */
function updateContainerNameAtPath(
  obj: any,
  dslPath: string,
  newContainerName: string
): boolean {
  // Remove leading slash and split path into segments
  const pathSegments = dslPath.replace(/^\//, '').split('/');

  let current = obj;

  // Navigate through all segments except the last one
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i];

    // Handle array access like "entities[0]"
    const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);

      if (!current[arrayName] || !Array.isArray(current[arrayName])) {
        return false;
      }

      if (index >= current[arrayName].length) {
        return false;
      }

      current = current[arrayName][index];
    } else {
      // Handle regular property access
      // Skip the first "operation" segment since the obj is already the operation
      if (segment === 'operation') {
        continue;
      }

      if (!current[segment]) {
        return false;
      }
      current = current[segment];
    }
  }

  // Handle the final segment (the property to update)
  const finalSegment = pathSegments[pathSegments.length - 1];

  if (finalSegment === 'container_name') {
    // Update container_name directly (not in item - that's only for entity_quantity and entity_type)
    if ('container_name' in current) {
      current.container_name = newContainerName;
      return true;
    }
  }

  return false;
}
