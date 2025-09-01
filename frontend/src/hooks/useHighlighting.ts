import { useCallback } from 'react';
import type { ComponentMapping } from '../types/visualInteraction';
import { numberToWord } from '../utils/numberUtils';
import { createSentencePatterns, findSentencePosition, findQuantityInText, splitIntoSentences, scoreSentencesForEntity, findEntityNameInSentence, findAllEntityNameOccurrencesInText } from '../utils/mwpUtils';
import { HIGHLIGHT_COLORS, createDropShadow } from '../utils/colorConfig';
import { clearElementHighlight } from '../utils/highlightUtils';

interface UseHighlightingProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  componentMappings: ComponentMapping;
  mwpValue: string;
  onDSLRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onMWPRangeHighlight?: (ranges: Array<[number, number]>) => void;
}

interface HighlightConfig {
  icon: string;
  label: string;
  applyVisualHighlight: (mapping: any) => void;
  applyMWPHighlight: (mapping: any) => void;
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
}: UseHighlightingProps) => {

  /**
   * Clear all visual highlights from SVG elements
   */
  const clearVisualHighlights = useCallback(() => {
    const allInteractiveElements = svgRef.current?.querySelectorAll('[data-dsl-path]');
    allInteractiveElements?.forEach(elem => {
      const svgElem = elem as SVGElement;
      clearElementHighlight(svgElem);
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
   * Base function for triggering highlighting with common logic
   */
  const triggerHighlight = useCallback((
    mapping: any | undefined,
    config: HighlightConfig
  ) => {
    // Clear previous highlights regardless of mapping
    clearVisualHighlights();

    // Apply specific visual highlighting
    config.applyVisualHighlight(mapping);

    // Highlight in DSL editor using mapping (if provided)
    if (onDSLRangeHighlight) {
      onDSLRangeHighlight(mapping?.dsl_range ? [mapping.dsl_range] : []);
    }

    // Apply MWP highlighting
    if (onMWPRangeHighlight) {
      config.applyMWPHighlight(mapping);
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
          targetBox.style.stroke = '#3b82f6';
          targetBox.style.strokeWidth = '3';
          targetBox.style.filter = createDropShadow(HIGHLIGHT_COLORS.BOX, 3);
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
  const triggerTextHighlight = useCallback((dslPath: string) => {
    const mapping = componentMappings[dslPath];
    triggerHighlight(mapping, {
      icon: '📝',
      label: 'Text',
      applyVisualHighlight: () => {
        const quantityTextEl = svgRef.current?.querySelector(`text[data-dsl-path="${dslPath}"]`) as SVGElement;
        if (quantityTextEl) {
          quantityTextEl.style.fill = '#3b82f6';
          quantityTextEl.style.fontWeight = 'bold';
          quantityTextEl.style.filter = createDropShadow(HIGHLIGHT_COLORS.TEXT, 2);
        }
      },
      applyMWPHighlight: (mapping) => {
        const quantity = mapping?.property_value;
        
        // Early return if missing required data
        if (!quantity || !mwpValue || !onMWPRangeHighlight) {
          onMWPRangeHighlight?.([]);
          return;
        }
        
        // Find quantity position in text
        const position = findQuantityInText(mwpValue, quantity);
        
        if (position) {
          const [start, end] = position;
          onMWPRangeHighlight([[start, end]]);
        } else {
          onMWPRangeHighlight([]);
        }
      }
    });
  }, [triggerHighlight, svgRef, componentMappings, mwpValue, onMWPRangeHighlight]);

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
          // Get the bounding box to calculate the actual center
          const bbox = operationEl.getBBox();
          const centerX = bbox.x + bbox.width / 2;
          const centerY = bbox.y + bbox.height / 2;
          
          operationEl.style.filter = createDropShadow(HIGHLIGHT_COLORS.OPERATION, 4);
          operationEl.style.transform = 'scale(1.1)';
          operationEl.style.transformOrigin = `${centerX}px ${centerY}px`;
          operationEl.style.vectorEffect = 'non-scaling-stroke';
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
          // For embedded SVGs, use their position attributes to calculate center
          const x = parseFloat(embeddedSvgEl.getAttribute('x') || '0');
          const y = parseFloat(embeddedSvgEl.getAttribute('y') || '0');
          const width = parseFloat(embeddedSvgEl.getAttribute('width') || '0');
          const height = parseFloat(embeddedSvgEl.getAttribute('height') || '0');
          
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          
          embeddedSvgEl.style.filter = createDropShadow(HIGHLIGHT_COLORS.SVG);
          embeddedSvgEl.style.transform = 'scale(1.05)';
          embeddedSvgEl.style.transformOrigin = `${centerX}px ${centerY}px`;
          embeddedSvgEl.style.vectorEffect = 'non-scaling-stroke';
        }
      },
      applyMWPHighlight: () => handleEmbeddedSvgMWPHighlight(dslPath)
    });
  }, [triggerHighlight, svgRef, componentMappings, handleEmbeddedSvgMWPHighlight]);

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
        const containerTypeSvgEl = svgRef.current?.querySelector(`svg[data-dsl-path="${dslPath}"]`) as SVGGraphicsElement;
        if (containerTypeSvgEl) {
          // For container type SVGs, use their position attributes to calculate center
          const x = parseFloat(containerTypeSvgEl.getAttribute('x') || '0');
          const y = parseFloat(containerTypeSvgEl.getAttribute('y') || '0');
          const width = parseFloat(containerTypeSvgEl.getAttribute('width') || '0');
          const height = parseFloat(containerTypeSvgEl.getAttribute('height') || '0');
          
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          
          containerTypeSvgEl.style.filter = createDropShadow(HIGHLIGHT_COLORS.SVG);
          containerTypeSvgEl.style.transform = 'scale(1.05)';
          containerTypeSvgEl.style.transformOrigin = `${centerX}px ${centerY}px`;
          containerTypeSvgEl.style.vectorEffect = 'non-scaling-stroke';
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
    const ranges: Array<[number, number]> = Array.from(mwpValue.matchAll(regex))
      .map(match => [match.index, match.index + match[0].length]);
    
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
          containerNameTextEl.style.fill = '#3b82f6';
          containerNameTextEl.style.fontWeight = 'bold';
          containerNameTextEl.style.filter = createDropShadow(HIGHLIGHT_COLORS.TEXT, 2);
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
          targetBox.style.stroke = '#3b82f6';
          targetBox.style.strokeWidth = '3';
          targetBox.style.filter = createDropShadow(HIGHLIGHT_COLORS.BOX, 3);
        }
      },
      applyMWPHighlight: () => {
        // For result containers, we don't highlight anything in the MWP
        onMWPRangeHighlight?.([]);
      }
    });
  }, [triggerHighlight, svgRef, componentMappings, onMWPRangeHighlight]);

  return {
    clearVisualHighlights,
    clearAllHighlights,
    triggerBoxHighlight,
    triggerTextHighlight,
    triggerOperationHighlight,
    triggerEmbeddedSvgHighlight,
    triggerContainerTypeHighlight,
    triggerContainerNameHighlight,
    triggerResultContainerHighlight,
  };
};
