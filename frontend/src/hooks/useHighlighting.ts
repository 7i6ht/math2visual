import { useCallback, useMemo } from 'react';
import type { ComponentMapping, ComponentMappingEntry } from '../types/visualInteraction';
import { numberToWord } from '../utils/numberUtils';
import { createSentencePatterns, findSentencePosition, findQuantityInText, splitIntoSentences, findAllNameOccurrencesInText } from '../utils/mwpUtils';
import { MAX_ITEM_DISPLAY } from '../config/api';
import { useDSLContext } from '@/contexts/DSLContext';
import { useHighlightingContext } from '@/contexts/HighlightingContext';

interface UseHighlightingProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  mwpValue: string;
  formulaValue?: string;
}

interface HighlightConfig {
  applyVisualHighlight: (mapping: ComponentMappingEntry | undefined) => void;
  applyMWPHighlight: (mapping: ComponentMappingEntry | undefined) => void;
}

/**
 * Hook for managing visual highlighting functionality
 * Handles clearing highlights and triggering different types of highlights (box, text, operation)
 */
export const useHighlighting = ({
  svgRef,
  mwpValue,
  formulaValue,
}: UseHighlightingProps) => {
  const { componentMappings } = useDSLContext();
  const { setDslHighlightRanges: onDSLRangeHighlight, setMwpHighlightRanges: onMWPRangeHighlight, setFormulaHighlightRanges, currentDSLPath, currentTargetElement, clearHighlighting } = useHighlightingContext();
  const mappings: ComponentMapping = useMemo(() => (componentMappings || {}) as ComponentMapping, [componentMappings]);


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
    mapping: ComponentMappingEntry | undefined,
    config: HighlightConfig
  ) => {

    // Apply specific visual highlighting
    config.applyVisualHighlight(mapping);

    // Highlight in DSL editor using mapping (if provided)
    onDSLRangeHighlight(mapping?.dsl_range ? [mapping.dsl_range] : []);

    // Apply MWP highlighting
    config.applyMWPHighlight(mapping);
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
  const triggerBoxHighlight = useCallback((mapping: ComponentMappingEntry | undefined, dslPath: string) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: () => {
        const targetBox = currentTargetElement as SVGElement;
        targetBox.classList.add('highlighted-box');
      },
      applyMWPHighlight: () => {
        const containerNamePath = `${dslPath}/container_name`;
        const entityNamePath = `${dslPath}/entity_name`;
        const quantityPath = `${dslPath}/entity_quantity`;
        
        const containerName = mappings[containerNamePath]?.property_value;
        const entityName = mappings[entityNamePath]?.property_value;
        const quantity = mappings[quantityPath]?.property_value;

        // Early return if missing required data
        if (!entityName || !mwpValue) {
          onMWPRangeHighlight([]);
          return;
        }
        
        // Use utility function to create sentence patterns
        const sentencePatterns = createSentencePatterns(entityName, quantity, containerName);

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
  }, [triggerHighlight, mappings, mwpValue, onMWPRangeHighlight, currentTargetElement]);

  /**
   * Trigger highlighting for text/quantity components
   */
  const triggerEntityQuantityHighlight = useCallback((mapping: ComponentMappingEntry | undefined, dslPath: string) => {
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
      const quantityTextEl = currentTargetElement as SVGElement;
      quantityTextEl.classList.add('highlighted-text');
    }
    
    // Common DSL and MWP highlighting logic
    onDSLRangeHighlight(mapping?.dsl_range ? [mapping.dsl_range] : []);
    
    if (quantity && mwpValue) {
      const positions = findQuantityInText(mwpValue, quantity);
      onMWPRangeHighlight(positions ?? []);
    }

    // Highlight in formula (optional) — analogous to MWP highlighting
    if (quantity && formulaValue) {
      const positions = findQuantityInText(formulaValue, quantity);
      setFormulaHighlightRanges(positions ?? []);
    }
  }, [setSvgTransformOrigin, svgRef, mwpValue, onMWPRangeHighlight, onDSLRangeHighlight, formulaValue, setFormulaHighlightRanges, currentTargetElement]);

  /**
   * Trigger highlighting for operation components
   */
  const triggerOperationHighlight = useCallback((mapping: ComponentMappingEntry | undefined, dslPath: string) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: () => {
        const operationEl = currentTargetElement as SVGGraphicsElement;
        // Apply CSS class - transform origin is already set by setupSvgTransformOrigins
        operationEl.classList.add('highlighted-svg');
      },
      applyMWPHighlight: () => {
        highlightSecondOperandSentence(dslPath);
      }
    });
  }, [triggerHighlight, highlightSecondOperandSentence, currentTargetElement]);

  /**
   * Trigger highlighting for embedded SVG components (entity_type)
   */
  const triggerEmbeddedSvgHighlight = useCallback((mapping: ComponentMappingEntry | undefined) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: () => {
        const embeddedSvgEl = currentTargetElement as SVGGraphicsElement;
        // Apply CSS class and set custom transform origin
        embeddedSvgEl.classList.add('highlighted-svg');
        setSvgTransformOrigin(embeddedSvgEl);
      },
      applyMWPHighlight: () => {
        if (!mapping?.property_value || !mwpValue) {
          onMWPRangeHighlight([]);
          return;
        }
        const entityName = mapping.property_value;
        const fallbackRanges = findAllNameOccurrencesInText(entityName, mwpValue);
        onMWPRangeHighlight(fallbackRanges);
      }
    });
  }, [triggerHighlight, setSvgTransformOrigin, mwpValue, onMWPRangeHighlight, currentTargetElement]);

  /**
   * Generic function to handle MWP highlighting for text-based elements
   */
  const handleTextElementMWPHighlight = useCallback((mapping: ComponentMappingEntry | undefined) => {
    if (!mapping?.property_value || !mwpValue) {
      onMWPRangeHighlight([]);
      return;
    }
    
    const textValue = mapping.property_value;
    const ranges = findAllNameOccurrencesInText(textValue, mwpValue);
    
    onMWPRangeHighlight(ranges);
  }, [mwpValue, onMWPRangeHighlight]);

  /**
   * Generic function to handle visual highlighting for SVG elements with position attributes
   */
  const applySVGVisualHighlight = useCallback((_mapping: ComponentMappingEntry | undefined) => {
    const svgEl = currentTargetElement as SVGElement;
    // For SVG elements, use their position attributes to calculate center
    const x = parseFloat(svgEl.getAttribute('x') || '0');
    const y = parseFloat(svgEl.getAttribute('y') || '0');
    const width = parseFloat(svgEl.getAttribute('width') || '0');
    const height = parseFloat(svgEl.getAttribute('height') || '0');
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Apply CSS class and set custom transform origin
    svgEl.classList.add('highlighted-svg');
    svgEl.style.transformOrigin = `${centerX}px ${centerY}px`;
  }, [currentTargetElement]);

  /**
   * Generic function to handle visual highlighting for text elements
   */
  const applyTextVisualHighlight = useCallback((_mapping: ComponentMappingEntry | undefined) => {
    const textEl = currentTargetElement as SVGElement;
    textEl.classList.add('highlighted-text');
  }, [currentTargetElement]);


  /**
   * Trigger highlighting for container_type components (embedded SVGs on containers)
   */
  const triggerContainerTypeHighlight = useCallback((mapping: ComponentMappingEntry | undefined) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: (mapping) => applySVGVisualHighlight(mapping),
      applyMWPHighlight: (mapping) => handleTextElementMWPHighlight(mapping)
    });
  }, [triggerHighlight, applySVGVisualHighlight, handleTextElementMWPHighlight]);

  /**
   * Trigger highlighting for attr_name components (text elements for attribute names)
   */
  const triggerAttrNameHighlight = useCallback((mapping: ComponentMappingEntry | undefined) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: (mapping) => applyTextVisualHighlight(mapping),
      applyMWPHighlight: (mapping) => handleTextElementMWPHighlight(mapping)
    });
  }, [triggerHighlight, applyTextVisualHighlight, handleTextElementMWPHighlight]);

  /**
   * Trigger highlighting for attr_type components (embedded SVGs for attributes)
   */
  const triggerAttrTypeHighlight = useCallback((mapping: ComponentMappingEntry | undefined) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: (mapping) => applySVGVisualHighlight(mapping),
      applyMWPHighlight: (mapping) => handleTextElementMWPHighlight(mapping)
    });
  }, [triggerHighlight, applySVGVisualHighlight, handleTextElementMWPHighlight]);


  /**
   * Trigger highlighting for container_name components (text elements)
   */
  const triggerContainerNameHighlight = useCallback((mapping: ComponentMappingEntry | undefined) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: (mapping) => applyTextVisualHighlight(mapping),
      applyMWPHighlight: (mapping) => handleTextElementMWPHighlight(mapping)
    });
  }, [triggerHighlight, applyTextVisualHighlight, handleTextElementMWPHighlight]);

  /**
   * Trigger highlighting for result container components (box elements)
   */
  const triggerResultContainerHighlight = useCallback((mapping: ComponentMappingEntry | undefined) => {
    triggerHighlight(mapping, {
      applyVisualHighlight: () => {
        const targetBox = currentTargetElement as SVGElement;
        targetBox.classList.add('highlighted-box');
      },
      applyMWPHighlight: () => {
        // For result containers, we don't highlight anything in the MWP
        onMWPRangeHighlight([]);
      }
    });
  }, [triggerHighlight, onMWPRangeHighlight, currentTargetElement]);

  const clearHighlights = useCallback(() => {
    clearHighlighting();
    if (svgRef.current) {
      const highlightedElements = svgRef.current.querySelectorAll('.highlighted-box, .highlighted-text, .highlighted-svg');
      highlightedElements.forEach((element) => {
        element.classList.remove('highlighted-box', 'highlighted-text', 'highlighted-svg');
      });
    }
  }, [clearHighlighting, svgRef]);

  /**
   * Highlight the visual element corresponding to the current DSL path
   */
  const highlightCurrentDSLPath = useCallback(() => {
    setFormulaHighlightRanges([])
    if (!currentDSLPath) {
      clearHighlights();
      return;
    }

    // Remove indices from the end of the path for matching
    const basePath = currentDSLPath.endsWith(']') ? currentDSLPath.slice(0, -3) : currentDSLPath;

    // Get the mapping for the current DSL path
    let mapping = mappings[currentDSLPath];
    
    // Handle indexed paths - convert to base path if needed
    if (!mapping && currentDSLPath.includes('/entity_type[')) {
      const basePath = currentDSLPath.replace(/\/entity_type\[\d+\]$/, '/entity_type');
      mapping = mappings[basePath];
    }

    // Map DSL path types to their corresponding highlight functions
    const pathTypeHandlers: Record<string, () => void> = {
      'entity_quantity': () => triggerEntityQuantityHighlight(mapping, currentDSLPath),
      'container_name': () => triggerContainerNameHighlight(mapping),
      'attr_name': () => triggerAttrNameHighlight(mapping),
      'entity_type': () => triggerEmbeddedSvgHighlight(mapping),
      'container_type': () => triggerContainerTypeHighlight(mapping),
      'attr_type': () => triggerAttrTypeHighlight(mapping),
      'operation': () => triggerOperationHighlight(mapping, currentDSLPath),
    };

    // Find the matching handler for the current path
    const pathType = basePath.split('/').pop();
    const handler = pathType && pathTypeHandlers[pathType];

    if (handler) {
      handler(); // Execute the handler function
    } else if (basePath.endsWith('entities')) {
      // Special case for entity containers (boxes)
      triggerBoxHighlight(mapping, currentDSLPath);
    }
  }, [currentDSLPath, currentTargetElement, setFormulaHighlightRanges, triggerEntityQuantityHighlight, triggerContainerNameHighlight, triggerAttrNameHighlight, triggerEmbeddedSvgHighlight, triggerContainerTypeHighlight, triggerAttrTypeHighlight, triggerBoxHighlight, triggerOperationHighlight, clearHighlighting, svgRef, mappings]);


  const returnValue = useMemo(() => ({
    setupTransformOrigins,
    triggerBoxHighlight,
    triggerEntityQuantityHighlight,
    triggerOperationHighlight,
    triggerEmbeddedSvgHighlight,
    triggerContainerTypeHighlight,
    triggerAttrTypeHighlight,
    triggerContainerNameHighlight,
    triggerAttrNameHighlight,
    triggerResultContainerHighlight,
    highlightCurrentDSLPath,
  }), [
    setupTransformOrigins,
    triggerBoxHighlight,
    triggerEntityQuantityHighlight,
    triggerOperationHighlight,
    triggerEmbeddedSvgHighlight,
    triggerContainerTypeHighlight,
    triggerAttrTypeHighlight,
    triggerContainerNameHighlight,
    triggerAttrNameHighlight,
    triggerResultContainerHighlight,
    highlightCurrentDSLPath,
  ]);

  return returnValue;
};
