import { useCallback } from 'react';
import type { ComponentMapping } from '../types/visualInteraction';
import { numberToWord } from '../utils/numberUtils';
import { createSentencePatterns, findSentencePosition, findQuantityInText, splitIntoSentences, scoreSentencesForEntity, findEntityNameInSentence, findAllEntityNameOccurrencesInText } from '../utils/mwpUtils';
import { MAX_ITEM_DISPLAY } from '../config/api';

interface UseHighlightingProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  componentMappings: ComponentMapping;
  mwpValue: string;
  onDSLRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onMWPRangeHighlight?: (ranges: Array<[number, number]>) => void;
  currentDSLPath?: string | null;
}

interface HighlightConfig {
  icon: string;
  label: string;
  applyVisualHighlight: () => void;
  applyMWPHighlight: () => void;
}

/**
 * Hook for managing visual highlighting functionality
 * Handles clearing highlights and triggering different types of highlights (box, text, operation)
 */
export const useHighlighting = ({
  svgRef,
  componentMappings,
  mwpValue,
  onDSLRangeHighlight,
  onMWPRangeHighlight,
  currentDSLPath,
}: UseHighlightingProps) => {

  /**
   * Clear all visual highlights from SVG elements
   */
  const clearVisualHighlights = useCallback(() => {
    const allInteractiveElements = svgRef.current?.querySelectorAll('[data-dsl-path]');
    allInteractiveElements?.forEach(elem => {
      const svgElem = elem as SVGElement;
      // Remove all highlighting CSS classes
      svgElem.classList.remove('highlighted-box', 'highlighted-text', 'highlighted-operation', 'highlighted-svg');
      // Clear transformOrigin since we still set it in JavaScript for positioning
      svgElem.style.transformOrigin = '';
    });
  }, [svgRef]);

  /**
   * Clear all highlights (visual, DSL, and MWP)
   */
    const clearAllHighlights = useCallback(() => {
      clearVisualHighlights();
  
      // Clear DSL and MWP highlights
      onDSLRangeHighlight?.([]);
      onMWPRangeHighlight?.([]);
    }, [clearVisualHighlights, onDSLRangeHighlight, onMWPRangeHighlight]);

  /**
   * Set transform origin for embedded SVG elements using position attributes
   */
  const setSvgTransformOrigin = useCallback((svgElem: SVGElement) => {
    const x = parseFloat(svgElem.getAttribute('x') || '0');
    const y = parseFloat(svgElem.getAttribute('y') || '0');
    const width = parseFloat(svgElem.getAttribute('width') || '0');
    const height = parseFloat(svgElem.getAttribute('height') || '0');
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    svgElem.style.transformOrigin = `${centerX}px ${centerY}px`;
  }, []);

  /**
   * Set transform origin for group elements (operations) using getBBox for accurate positioning
   */
  const setGroupTransformOrigin = useCallback((groupElem: SVGElement) => {
    try {
      const gElement = groupElem as SVGGraphicsElement;
      const bbox = gElement.getBBox();
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      
      groupElem.style.transformOrigin = `${centerX}px ${centerY}px`;
    } catch {
      // Fallback to center if getBBox fails
      groupElem.style.transformOrigin = 'center';
    }
  }, []);

  /**
   * Setup transform origins for all interactive elements to ensure proper scaling
   */
  const setupTransformOrigins = useCallback(() => {
    // Handle SVG elements using position attributes
    const allSvgElements = svgRef.current?.querySelectorAll('svg[data-dsl-path]');
    allSvgElements?.forEach(elem => {
      setSvgTransformOrigin(elem as SVGElement);
    });
    
    // Handle group elements (operations) using getBBox
    const allGroupElements = svgRef.current?.querySelectorAll('g[data-dsl-path]');
    allGroupElements?.forEach(elem => {
      setGroupTransformOrigin(elem as SVGElement);
    });
  }, [svgRef, setSvgTransformOrigin, setGroupTransformOrigin]);

  /**
   * Base function for triggering highlighting with common logic
   */
  const triggerHighlight = useCallback((
    mapping: any | undefined,
    config: HighlightConfig
  ) => {
    // Clear previous highlights regardless of mapping
    clearVisualHighlights();

    // Apply specific visual highlighting
    config.applyVisualHighlight();

    // Highlight in DSL editor using mapping (if provided)
    if (onDSLRangeHighlight) {
      onDSLRangeHighlight(mapping?.dsl_range ? [mapping.dsl_range] : []);
    }

    // Apply MWP highlighting
    if (onMWPRangeHighlight) {
      config.applyMWPHighlight();
    }
  }, [clearVisualHighlights, onDSLRangeHighlight, onMWPRangeHighlight]);

  /**
   * Find and highlight the sentence containing the second operand of an operation
   */
  const highlightSecondOperandSentence = useCallback((operationDslPath: string) => {
    // Early return if missing required data
    if (!mwpValue || !onMWPRangeHighlight) return;

    // Find the second operand's value by looking for sibling entities 
    const secondOperandPath = `${operationDslPath}/entities[1]`;
    const secondOperandQuantityPath = `${secondOperandPath}/entity_quantity`;
    const secondOperandQuantity = componentMappings[secondOperandQuantityPath]?.property_value;
    
    // Early return if no quantity found
    if (!secondOperandQuantity) return;
    
    // Find sentence containing the second operand value using utility functions
    const sentences = splitIntoSentences(mwpValue);
    const numericQuantity = secondOperandQuantity.toString();
    const wordQuantity = numberToWord(parseInt(secondOperandQuantity.toString()));
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      
      // Check if sentence contains either the numeric form or word form
      const containsNumeric = sentence.includes(numericQuantity);
      const containsWord = sentence.toLowerCase().includes(wordQuantity.toLowerCase());
      
      if (containsNumeric || containsWord) {
        // Use utility function to find sentence position
        const position = findSentencePosition(mwpValue, sentences, i, sentence);
        if (position) {
          const [actualStart, actualEnd] = position;
          onMWPRangeHighlight([[actualStart, actualEnd]]);
          return;
        }
      }
    }
  }, [mwpValue, componentMappings, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for box/container components
   */
  const triggerBoxHighlight = useCallback((dslPath: string) => {
    const mapping = componentMappings[dslPath];
    triggerHighlight(mapping, {
      icon: '🔲',
      label: 'Box',
      applyVisualHighlight: () => {
        const targetBox = svgRef.current?.querySelector(`[data-dsl-path="${dslPath}"]:not(text)`) as SVGElement;
        if (targetBox) {
          targetBox.classList.add('highlighted-box');
        }
      },
      applyMWPHighlight: () => {
        const containerNamePath = `${dslPath}/container_name`;
        const entityNamePath = `${dslPath}/entity_name`;
        const quantityPath = `${dslPath}/entity_quantity`;
        
        const containerName = componentMappings[containerNamePath]?.property_value;
        const entityName = componentMappings[entityNamePath]?.property_value;
        const quantity = componentMappings[quantityPath]?.property_value;

        // Early return if missing required data
        if (!containerName || !mwpValue || !onMWPRangeHighlight) {
          onMWPRangeHighlight?.([]);
          return;
        }
        
        // Use utility function to create sentence patterns
        const sentencePatterns = createSentencePatterns(containerName, quantity, entityName);

        for (let i = 0; i < sentencePatterns.length; i++) {
          const pattern = sentencePatterns[i] as RegExp;
          const sentenceMatch = pattern.exec(mwpValue);
          if (sentenceMatch) {
            const sentenceStart = sentenceMatch.index;
            const sentenceEnd = sentenceStart + sentenceMatch[1].length;
            onMWPRangeHighlight([[sentenceStart, sentenceEnd]]);
            return;
          }
        }
        
        // No match found
        onMWPRangeHighlight([]);
      }
    });
  }, [triggerHighlight, svgRef, componentMappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for text/quantity components
   */
  const triggerEntityQuantityHighlight = useCallback((dslPath: string) => {
    const mapping = componentMappings[dslPath];
    const quantity = mapping?.property_value;
    const quantityNum = quantity ? Number(quantity) : NaN;
    
    // Clear previous highlights
    clearVisualHighlights();
    
    // Apply visual highlighting based on quantity threshold
    if (!Number.isNaN(quantityNum) && quantityNum <= MAX_ITEM_DISPLAY) {
      // Highlight all individual embedded SVGs for quantities below threshold
      const entityPath = dslPath.replace(/\/entity_quantity$/, '');
      const entityTypePath = `${entityPath}/entity_type`;
      
      for (let i = 0; i < quantityNum; i++) {
        const indexedPath = `${entityTypePath}[${i}]`;
        const embeddedSvgEl = svgRef.current?.querySelector(`svg[data-dsl-path="${indexedPath}"]`) as SVGGraphicsElement;
        if (embeddedSvgEl) {
          embeddedSvgEl.classList.add('highlighted-svg');
          setSvgTransformOrigin(embeddedSvgEl);
        }
      }
    } else {
      // Highlight quantity text for quantities above threshold
      const quantityTextEl = svgRef.current?.querySelector(`text[data-dsl-path="${dslPath}"]`) as SVGElement;
      if (quantityTextEl) {
        quantityTextEl.classList.add('highlighted-text');
      }
    }
    
    // Common DSL and MWP highlighting logic
    if (onDSLRangeHighlight) {
      onDSLRangeHighlight(mapping?.dsl_range ? [mapping.dsl_range] : []);
    }
    
    if (onMWPRangeHighlight && quantity && mwpValue) {
      const position = findQuantityInText(mwpValue, quantity);
      if (position) {
        const [start, end] = position;
        onMWPRangeHighlight([[start, end]]);
      } else {
        onMWPRangeHighlight([]);
      }
    }
  }, [clearVisualHighlights, setSvgTransformOrigin, svgRef, componentMappings, mwpValue, onMWPRangeHighlight, onDSLRangeHighlight]);

  /**
   * Trigger highlighting for operation components
   */
  const triggerOperationHighlight = useCallback((dslPath: string) => {
    const mapping = componentMappings[dslPath];
    triggerHighlight(mapping, {
      icon: '⚙️',
      label: 'Operation',
      applyVisualHighlight: () => {
        const operationEl = svgRef.current?.querySelector(`g[data-dsl-path="${dslPath}"]`) as SVGGraphicsElement;
        if (operationEl) {
          // Apply CSS class - transform origin is already set by setupSvgTransformOrigins
          operationEl.classList.add('highlighted-operation');
        }
      },
      applyMWPHighlight: () => {
        highlightSecondOperandSentence(dslPath);
      }
    });
  }, [triggerHighlight, svgRef, componentMappings, highlightSecondOperandSentence]);

  /**
   * Handle MWP highlighting for container_type elements
   */
  const handleContainerTypeMWPHighlight = useCallback((dslPath: string) => {
    // Get the container name for highlighting
    // Container_type paths are always non-indexed: /operation/entities[0]/container_type
    const containerPath = dslPath.replace(/\/container_type$/, '');
    const containerNamePath = `${containerPath}/container_name`;
    
    const containerNameMapping = componentMappings[containerNamePath];
    
    if (!containerNameMapping?.property_value || !mwpValue) {
      onMWPRangeHighlight?.([]);
      return;
    }
    
    const containerName = containerNameMapping.property_value;
    
    // Find all occurrences of the container name using regex with word boundaries and plural support
    const escapedName = containerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    const regex = new RegExp(`\\b${escapedName}s?\\b`, 'gi'); // Word boundaries, optional 's' for plural, case-insensitive
    
    // Functional approach: map matches to ranges
    const ranges: Array<[number, number]> = Array.from(mwpValue.matchAll(regex))
      .map(match => [match.index, match.index + match[0].length]);
    
    onMWPRangeHighlight?.(ranges);
  }, [componentMappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Handle MWP highlighting for embedded SVG elements
   */
  const handleEmbeddedSvgMWPHighlight = useCallback((dslPath: string) => {
    // Get the component mappings for this entity
    // Handle both indexed format (/entity_type[0]) and non-indexed format (/entity_type)
    const entityPath = dslPath.replace(/\/entity_type(\[\d+\])?$/, '');
    const entityNamePath = `${entityPath}/entity_name`;
    const containerNamePath = `${entityPath}/container_name`;
    const quantityPath = `${entityPath}/entity_quantity`;
    
    const entityNameMapping = componentMappings[entityNamePath];
    const containerNameMapping = componentMappings[containerNamePath];
    const quantityMapping = componentMappings[quantityPath];
    
    if (!entityNameMapping?.property_value || !containerNameMapping?.property_value || !quantityMapping?.property_value || !mwpValue) {
      onMWPRangeHighlight?.([]);
      return;
    }
    
    const entityName = entityNameMapping.property_value;
    const containerName = containerNameMapping.property_value;
    const quantity = quantityMapping.property_value;
    
    // Split text into sentences and score them
    const sentences = splitIntoSentences(mwpValue);
    const sentenceScores = scoreSentencesForEntity(sentences, containerName, quantity);
    
    // Try to highlight entity_name in the best matching sentence
    if (sentenceScores.length > 0) {
      const bestMatch = sentenceScores[0];
      const ranges = findEntityNameInSentence(
        entityName, 
        bestMatch.sentence, 
        bestMatch.index, 
        sentences, 
        mwpValue
      );
      
      if (ranges && ranges.length > 0) {
        onMWPRangeHighlight?.(ranges);
        return;
      }
    }
    
    // Fallback: highlight all entity_name occurrences
    const fallbackRanges = findAllEntityNameOccurrencesInText(entityName, mwpValue);
    onMWPRangeHighlight?.(fallbackRanges);
  }, [componentMappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for embedded SVG components (entity_type)
   */
  const triggerEmbeddedSvgHighlight = useCallback((dslPath: string) => {
    // For embedded SVGs, get the appropriate mapping (indexed or non-indexed)
    let mapping = componentMappings[dslPath];
    
    // Handle indexed paths - convert to base path if needed
    if (!mapping && dslPath.includes('/entity_type[')) {
      const basePath = dslPath.replace(/\/entity_type\[\d+\]$/, '/entity_type');
      mapping = componentMappings[basePath];
    }

    triggerHighlight(mapping, {
      icon: '🖼️',
      label: 'Embedded SVG',
      applyVisualHighlight: () => {
        // Use the indexed dslPath to find the specific SVG element
        const embeddedSvgEl = svgRef.current?.querySelector(`svg[data-dsl-path="${dslPath}"]`) as SVGGraphicsElement;
        if (embeddedSvgEl) {
          // Apply CSS class and set custom transform origin
          embeddedSvgEl.classList.add('highlighted-svg');
          setSvgTransformOrigin(embeddedSvgEl);
        }
      },
      applyMWPHighlight: () => handleEmbeddedSvgMWPHighlight(dslPath)
    });
  }, [triggerHighlight, setSvgTransformOrigin, svgRef, componentMappings, handleEmbeddedSvgMWPHighlight]);

  /**
   * Trigger highlighting for container_type components (embedded SVGs on containers)
   */
  const triggerContainerTypeHighlight = useCallback((dslPath: string) => {
    // Container_type paths are always non-indexed: /operation/entities[0]/container_type
    const mapping = componentMappings[dslPath];
    
    triggerHighlight(mapping, {
      icon: '🏷️',
      label: 'Container Type',
      applyVisualHighlight: () => {
        // Use the dslPath to find the specific SVG element
        const containerTypeSvgEl = svgRef.current?.querySelector(`svg[data-dsl-path="${dslPath}"]`) as SVGElement;
        if (containerTypeSvgEl) {
          // For container type SVGs, use their position attributes to calculate center
          const x = parseFloat(containerTypeSvgEl.getAttribute('x') || '0');
          const y = parseFloat(containerTypeSvgEl.getAttribute('y') || '0');
          const width = parseFloat(containerTypeSvgEl.getAttribute('width') || '0');
          const height = parseFloat(containerTypeSvgEl.getAttribute('height') || '0');
          
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          
          // Apply CSS class and set custom transform origin
          containerTypeSvgEl.classList.add('highlighted-svg');
          containerTypeSvgEl.style.transformOrigin = `${centerX}px ${centerY}px`;
        }
      },
      applyMWPHighlight: () => handleContainerTypeMWPHighlight(dslPath)
    });
  }, [triggerHighlight, svgRef, componentMappings, handleContainerTypeMWPHighlight]);

  /**
   * Handle MWP highlighting for container_name elements
   */
  const handleContainerNameMWPHighlight = useCallback((dslPath: string) => {
    // Get the container name mapping directly from the path
    const containerNameMapping = componentMappings[dslPath];
    
    if (!containerNameMapping?.property_value || !mwpValue) {
      onMWPRangeHighlight?.([]);
      return;
    }
    
    const containerName = containerNameMapping.property_value;
    
    // Find all occurrences of the container name using regex with word boundaries and plural support
    const escapedName = containerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    const regex = new RegExp(`\\b${escapedName}s?\\b`, 'gi'); // Word boundaries, optional 's' for plural, case-insensitive
    
    // Functional approach: map matches to ranges
    const matches = Array.from(mwpValue.matchAll(regex));
    
    const ranges: Array<[number, number]> = matches
      .map(match => [match.index, match.index + match[0].length] as [number, number]);
    
    onMWPRangeHighlight?.(ranges);
  }, [componentMappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for container_name components (text elements)
   */
  const triggerContainerNameHighlight = useCallback((dslPath: string) => {
    // Container_name paths are always non-indexed: /operation/entities[0]/container_name
    const mapping = componentMappings[dslPath];
    
    triggerHighlight(mapping, {
      icon: '🏷️',
      label: 'Container Name',
      applyVisualHighlight: () => {
        // Use the dslPath to find the specific text element
        const containerNameTextEl = svgRef.current?.querySelector(`text[data-dsl-path="${dslPath}"]`) as SVGElement;
        if (containerNameTextEl) {
          containerNameTextEl.classList.add('highlighted-text');
        }
      },
      applyMWPHighlight: () => handleContainerNameMWPHighlight(dslPath)
    });
  }, [triggerHighlight, svgRef, componentMappings, handleContainerNameMWPHighlight]);

  /**
   * Trigger highlighting for result container components (box elements)
   */
  const triggerResultContainerHighlight = useCallback((dslPath: string) => {
    const mapping = componentMappings[dslPath];
    triggerHighlight(mapping, {
      icon: '📦',
      label: 'Result Container',
      applyVisualHighlight: () => {
        const targetBox = svgRef.current?.querySelector(`[data-dsl-path="${dslPath}"]:not(text)`) as SVGElement;
        if (targetBox) {
          targetBox.classList.add('highlighted-box');
        }
      },
      applyMWPHighlight: () => {
        // For result containers, we don't highlight anything in the MWP
        onMWPRangeHighlight?.([]);
      }
    });
  }, [triggerHighlight, svgRef, componentMappings, onMWPRangeHighlight]);

  /**
   * Highlight the visual element corresponding to the current DSL path
   */
  const highlightCurrentDSLPath = useCallback(() => {
  
    if (!currentDSLPath) {
      clearVisualHighlights();
      return;
    }

    // Remove indices from the end of the path for matching
    let basePath = currentDSLPath;
    if (basePath.endsWith(']')) {
      const lastBracketIndex = basePath.lastIndexOf('[');
      if (lastBracketIndex !== -1) {
        basePath = basePath.substring(0, lastBracketIndex);
      }
    }

    // Map DSL path types to their corresponding highlight functions
    const pathTypeHandlers: Record<string, () => void> = {
      'entity_quantity': () => triggerEntityQuantityHighlight(currentDSLPath),
      'container_name': () => triggerContainerNameHighlight(currentDSLPath),
      'entity_type': () => triggerEmbeddedSvgHighlight(currentDSLPath),
      'container_type': () => triggerContainerTypeHighlight(currentDSLPath),
      'operation': () => triggerOperationHighlight(currentDSLPath),
    };

    // Find the matching handler for the current path
    const pathType = basePath.split('/').pop();
    const handler = pathType && pathTypeHandlers[pathType];

    if (handler) {
      handler(); // Execute the handler function
    } else if (basePath.endsWith('entities')) {
      // Special case for entity containers (boxes)
      triggerBoxHighlight(currentDSLPath);
    } else {
      // For any other path type, just clear highlights
      clearVisualHighlights();
    }
  }, [currentDSLPath, componentMappings, clearVisualHighlights, triggerEntityQuantityHighlight, triggerContainerNameHighlight, triggerEmbeddedSvgHighlight, triggerContainerTypeHighlight, triggerBoxHighlight, triggerOperationHighlight]);

  return {
    clearVisualHighlights,
    clearAllHighlights,
    setupTransformOrigins,
    triggerBoxHighlight,
    triggerEntityQuantityHighlight,
    triggerOperationHighlight,
    triggerEmbeddedSvgHighlight,
    triggerContainerTypeHighlight,
    triggerContainerNameHighlight,
    triggerResultContainerHighlight,
    highlightCurrentDSLPath,
  };
};
