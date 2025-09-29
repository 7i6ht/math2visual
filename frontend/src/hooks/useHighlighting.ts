import { useCallback, useMemo } from 'react';
import type { ComponentMapping } from '../types/visualInteraction';
import { numberToWord } from '../utils/numberUtils';
import { createSentencePatterns, findSentencePosition, findQuantityInText, splitIntoSentences, scoreSentencesForEntity, findEntityNameInSentence, findAllEntityNameOccurrencesInText } from '../utils/mwpUtils';
import { MAX_ITEM_DISPLAY } from '../config/api';
import { useDSLContext } from '@/contexts/DSLContext';
import { useHighlightingContext } from '@/contexts/HighlightingContext';

interface UseHighlightingProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  mwpValue: string;
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
  mwpValue,
}: UseHighlightingProps) => {
  const { componentMappings } = useDSLContext();
  const { setDslHighlightRanges: onDSLRangeHighlight, setMwpHighlightRanges: onMWPRangeHighlight, currentDSLPath } = useHighlightingContext();
  const mappings: ComponentMapping = (componentMappings || {}) as ComponentMapping;

  /**
   * Clear highlight on a specific SVG element. If className is omitted,
   * remove all our highlight classes from that element only.
   */
  const clearHighlightForElement = useCallback((element: SVGElement, className: 'highlighted-box' | 'highlighted-text' | 'highlighted-svg') => {
    element.classList.remove(className);
    // Clear DSL and MWP highlights
    onMWPRangeHighlight([]);
    onDSLRangeHighlight([]);
  }, [onMWPRangeHighlight, onDSLRangeHighlight]);

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

  const setupTransformOrigins = useCallback(() => {
    // Handle SVG elements using position attributes
    const allSvgElements = svgRef.current?.querySelectorAll('svg[data-dsl-path]');
    allSvgElements?.forEach(elem => {
      setSvgTransformOrigin(elem as SVGElement);
    });
  }, [svgRef, setSvgTransformOrigin]);

  /**
   * Base function for triggering highlighting with common logic
   */
  const triggerHighlight = useCallback((
    mapping: { dsl_range?: [number, number] } | undefined,
    config: HighlightConfig
  ) => {

    // Apply specific visual highlighting
    config.applyVisualHighlight();

    // Highlight in DSL editor using mapping (if provided)
    onDSLRangeHighlight(mapping?.dsl_range ? [mapping.dsl_range] : []);

    // Apply MWP highlighting
    config.applyMWPHighlight();
  }, [onDSLRangeHighlight]);

  /**
   * Find and highlight the sentence containing the second operand of an operation
   */
  const highlightSecondOperandSentence = useCallback((operationDslPath: string) => {
    // Early return if missing required data
    if (!mwpValue) return;

    // Find the second operand's value by looking for sibling entities 
    const secondOperandPath = `${operationDslPath}/entities[1]`;
    const secondOperandQuantityPath = `${secondOperandPath}/entity_quantity`;
    const secondOperandQuantity = mappings[secondOperandQuantityPath]?.property_value;
    
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
  }, [mwpValue, mappings, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for box/container components
   */
  const triggerBoxHighlight = useCallback((dslPath: string) => {
    const mapping = mappings[dslPath];
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
        
        const containerName = mappings[containerNamePath]?.property_value;
        const entityName = mappings[entityNamePath]?.property_value;
        const quantity = mappings[quantityPath]?.property_value;

        // Early return if missing required data
        if (!containerName || !mwpValue) {
          onMWPRangeHighlight([]);
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
  }, [triggerHighlight, svgRef, mappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for text/quantity components
   */
  const triggerEntityQuantityHighlight = useCallback((dslPath: string) => {
    const mapping = mappings[dslPath];
    const quantity = mapping?.property_value;
    const quantityNum = quantity ? Number(quantity) : NaN;
    
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
    onDSLRangeHighlight(mapping?.dsl_range ? [mapping.dsl_range] : []);
    
    if (quantity && mwpValue) {
      const position = findQuantityInText(mwpValue, quantity);
      if (position) {
        const [start, end] = position;
        onMWPRangeHighlight([[start, end]]);
      } else {
        onMWPRangeHighlight([]);
      }
    }
  }, [setSvgTransformOrigin, svgRef, mappings, mwpValue, onMWPRangeHighlight, onDSLRangeHighlight]);

  /**
   * Trigger highlighting for operation components
   */
  const triggerOperationHighlight = useCallback((dslPath: string) => {
    const mapping = mappings[dslPath];
    triggerHighlight(mapping, {
      icon: '⚙️',
      label: 'Operation',
      applyVisualHighlight: () => {
        const operationEl = svgRef.current?.querySelector(`g[data-dsl-path="${dslPath}"]`) as SVGGraphicsElement;
        if (operationEl) {
          // Apply CSS class - transform origin is already set by setupSvgTransformOrigins
          operationEl.classList.add('highlighted-svg');
        }
      },
      applyMWPHighlight: () => {
        highlightSecondOperandSentence(dslPath);
      }
    });
  }, [triggerHighlight, svgRef, mappings, highlightSecondOperandSentence]);

  /**
   * Handle MWP highlighting for container_type elements
   */
  const handleContainerTypeMWPHighlight = useCallback((dslPath: string) => {
    // Get the container name for highlighting
    // Container_type paths are always non-indexed: /operation/entities[0]/container_type
    const containerPath = dslPath.replace(/\/container_type$/, '');
    const containerNamePath = `${containerPath}/container_name`;
    
    const containerNameMapping = mappings[containerNamePath];
    
    if (!containerNameMapping?.property_value || !mwpValue) {
      onMWPRangeHighlight([]);
      return;
    }
    
    const containerName = containerNameMapping.property_value;
    
    // Find all occurrences of the container name using regex with word boundaries and plural support
    const escapedName = containerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    const regex = new RegExp(`\\b${escapedName}s?\\b`, 'gi'); // Word boundaries, optional 's' for plural, case-insensitive
    
    // Functional approach: map matches to ranges
    const ranges: Array<[number, number]> = Array.from(mwpValue.matchAll(regex))
      .map(match => [match.index, match.index + match[0].length]);
    
    onMWPRangeHighlight(ranges);
  }, [mappings, mwpValue, onMWPRangeHighlight]);

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
    
    const entityNameMapping = mappings[entityNamePath];
    const containerNameMapping = mappings[containerNamePath];
    const quantityMapping = mappings[quantityPath];
    
    if (!entityNameMapping?.property_value || !containerNameMapping?.property_value || !quantityMapping?.property_value || !mwpValue) {
      onMWPRangeHighlight([]);
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
        onMWPRangeHighlight(ranges);
        return;
      }
    }
    
    // Fallback: highlight all entity_name occurrences
    const fallbackRanges = findAllEntityNameOccurrencesInText(entityName, mwpValue);
    onMWPRangeHighlight(fallbackRanges);
  }, [mappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for embedded SVG components (entity_type)
   */
  const triggerEmbeddedSvgHighlight = useCallback((dslPath: string) => {
    // For embedded SVGs, get the appropriate mapping (indexed or non-indexed)
    let mapping = mappings[dslPath];
    
    // Handle indexed paths - convert to base path if needed
    if (!mapping && dslPath.includes('/entity_type[')) {
      const basePath = dslPath.replace(/\/entity_type\[\d+\]$/, '/entity_type');
      mapping = mappings[basePath];
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
  }, [triggerHighlight, setSvgTransformOrigin, svgRef, mappings, handleEmbeddedSvgMWPHighlight]);

  /**
   * Trigger highlighting for container_type components (embedded SVGs on containers)
   */
  const triggerContainerTypeHighlight = useCallback((dslPath: string) => {
    // Container_type paths are always non-indexed: /operation/entities[0]/container_type
    const mapping = mappings[dslPath];
    
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
  }, [triggerHighlight, svgRef, mappings, handleContainerTypeMWPHighlight]);

  /**
   * Handle MWP highlighting for container_name elements
   */
  const handleContainerNameMWPHighlight = useCallback((dslPath: string) => {
    // Get the container name mapping directly from the path
    const containerNameMapping = mappings[dslPath];
    
    if (!containerNameMapping?.property_value || !mwpValue) {
      onMWPRangeHighlight([]);
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
    
    onMWPRangeHighlight(ranges);
  }, [mappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for container_name components (text elements)
   */
  const triggerContainerNameHighlight = useCallback((dslPath: string) => {
    // Container_name paths are always non-indexed: /operation/entities[0]/container_name
    const mapping = mappings[dslPath];
    
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
  }, [triggerHighlight, svgRef, mappings, handleContainerNameMWPHighlight]);

  /**
   * Trigger highlighting for result container components (box elements)
   */
  const triggerResultContainerHighlight = useCallback((dslPath: string) => {
    const mapping = mappings[dslPath];
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
        onMWPRangeHighlight([]);
      }
    });
  }, [triggerHighlight, svgRef, mappings, onMWPRangeHighlight]);

  /**
   * Highlight the visual element corresponding to the current DSL path
   */
  const highlightCurrentDSLPath = useCallback(() => {
  
    if (!currentDSLPath) {
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
    }
  }, [currentDSLPath, triggerEntityQuantityHighlight, triggerContainerNameHighlight, triggerEmbeddedSvgHighlight, triggerContainerTypeHighlight, triggerBoxHighlight, triggerOperationHighlight]);

  const returnValue = useMemo(() => ({
    clearHighlightForElement,
    setupTransformOrigins,
    triggerBoxHighlight,
    triggerEntityQuantityHighlight,
    triggerOperationHighlight,
    triggerEmbeddedSvgHighlight,
    triggerContainerTypeHighlight,
    triggerContainerNameHighlight,
    triggerResultContainerHighlight,
    highlightCurrentDSLPath,
  }), [
    clearHighlightForElement,
    setupTransformOrigins,
    triggerBoxHighlight,
    triggerEntityQuantityHighlight,
    triggerOperationHighlight,
    triggerEmbeddedSvgHighlight,
    triggerContainerTypeHighlight,
    triggerContainerNameHighlight,
    triggerResultContainerHighlight,
    highlightCurrentDSLPath,
  ]);

  return returnValue;
};
