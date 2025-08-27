import { useCallback } from 'react';
import type { ComponentMapping } from '../types/visualInteraction';
import { numberToWord } from '../utils/numberUtils';
import { isTextElement, isOperationElement, isBoxElement } from '../utils/elementUtils';
import { createSentencePatterns, findSentencePosition, findQuantityInText, splitIntoSentences } from '../utils/mwpUtils';

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
      
      if (isTextElement(svgElem)) {
        // Clear text highlights
        svgElem.style.fill = 'white';
        svgElem.style.filter = '';
      } else if (isOperationElement(svgElem)) {
        // Clear operation highlights
        svgElem.style.filter = '';
        svgElem.style.transform = '';
        svgElem.style.transformOrigin = '';
      } else if (isBoxElement(svgElem)) {
        // Clear box highlights (only for rectangles)
        svgElem.style.stroke = 'black';
        svgElem.style.strokeWidth = '1';
        svgElem.style.filter = '';
      }
    });
  }, [svgRef]);

  /**
   * Clear all highlights (visual, DSL, and MWP)
   */
  const clearAllHighlights = useCallback(() => {
    clearVisualHighlights();

    // Clear DSL and MWP highlights
    if (onDSLRangeHighlight) {
      onDSLRangeHighlight([]);
    }
    if (onMWPRangeHighlight) {
      onMWPRangeHighlight([]);
    }
  }, [clearVisualHighlights, onDSLRangeHighlight, onMWPRangeHighlight]);

  /**
   * Base function for triggering highlighting with common logic
   */
  const triggerHighlight = useCallback((
    dslPath: string,
    config: HighlightConfig
  ) => {
    console.log(`${config.icon} trigger${config.label}Highlight called: ${dslPath}`);

    const mapping = componentMappings[dslPath];
    console.log(`Mapping for ${config.label.toLowerCase()}:`, dslPath, mapping);
    
    if (mapping) {
      // Clear previous highlights
      clearVisualHighlights();

      // Apply specific visual highlighting
      config.applyVisualHighlight(mapping);

      // Highlight in DSL editor using mapping
      if (onDSLRangeHighlight) {
        console.log(`${config.icon} ${config.label} hover - using range:`, mapping.dsl_range);
        onDSLRangeHighlight(mapping.dsl_range ? [mapping.dsl_range] : []);
      }

      // Apply MWP highlighting
      if (onMWPRangeHighlight) {
        config.applyMWPHighlight(mapping);
      }
    }
  }, [componentMappings, clearVisualHighlights, onDSLRangeHighlight, onMWPRangeHighlight]);

  /**
   * Find and highlight the sentence containing the second operand of an operation
   */
  const highlightSecondOperandSentence = useCallback((operationDslPath: string) => {
    if (!mwpValue) return;

    // Extract operation type from DSL path
    const operationType = componentMappings[operationDslPath]?.property_value;
    
    // Find the second operand's value by looking for sibling entities 
    const secondOperandPath = `${operationDslPath}/entities[1]`;
    
    // Look for quantity in the second operand
    const secondOperandQuantityPath = `${secondOperandPath}/entity_quantity`;
    const secondOperandQuantity = componentMappings[secondOperandQuantityPath]?.property_value;
    
    console.log('Operation type:', operationType, 'Second operand quantity:', secondOperandQuantity);
    
    if (secondOperandQuantity) {
      // Find sentence containing the second operand value using utility functions
      const sentences = splitIntoSentences(mwpValue);
      const numericQuantity = secondOperandQuantity.toString();
      const wordQuantity = numberToWord(parseInt(secondOperandQuantity.toString()));
      
      console.log('Searching for quantity in forms:', { numeric: numericQuantity, word: wordQuantity });
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        
        // Check if sentence contains either the numeric form or word form
        const containsNumeric = sentence.includes(numericQuantity);
        const containsWord = sentence.toLowerCase().includes(wordQuantity.toLowerCase());
        
        if (containsNumeric || containsWord) {
          console.log(`Found matching sentence (${containsNumeric ? 'numeric' : 'word'} form):`, sentence);
          
          // Use utility function to find sentence position
          const position = findSentencePosition(mwpValue, sentences, i, sentence);
          if (position && onMWPRangeHighlight) {
            const [actualStart, actualEnd] = position;
            console.log('Found second operand sentence:', sentence, 'at range:', [actualStart, actualEnd]);
            onMWPRangeHighlight([[actualStart, actualEnd]]);
            return;
          }
        }
      }
    }
  }, [mwpValue, componentMappings, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for box/container components
   */
  const triggerBoxHighlight = useCallback((dslPath: string) => {
    triggerHighlight(dslPath, {
      icon: '🔲',
      label: 'Box',
      applyVisualHighlight: () => {
        const targetBox = svgRef.current?.querySelector(`[data-dsl-path="${dslPath}"]:not(text)`) as SVGElement;
        if (targetBox) {
          targetBox.style.stroke = '#3b82f6';
          targetBox.style.strokeWidth = '3';
          targetBox.style.filter = 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))';
        }
      },
      applyMWPHighlight: () => {
        const containerNamePath = `${dslPath}/container_name`;
        const entityNamePath = `${dslPath}/entity_name`;
        const quantityPath = `${dslPath}/entity_quantity`;
        
        const containerName = componentMappings[containerNamePath]?.property_value;
        const entityName = componentMappings[entityNamePath]?.property_value;
        const quantity = componentMappings[quantityPath]?.property_value;

        console.log('Box hover - looking for sentence with:', { containerName, entityName, quantity });

        if (containerName && mwpValue) {
          // Use utility function to create sentence patterns
          const sentencePatterns = createSentencePatterns(containerName, quantity, entityName);

          for (let i = 0; i < sentencePatterns.length; i++) {
            const pattern = sentencePatterns[i] as RegExp;
            const sentenceMatch = pattern.exec(mwpValue);
            if (sentenceMatch) {
              const sentenceStart = sentenceMatch.index;
              const sentenceEnd = sentenceStart + sentenceMatch[1].length;
              const patternType = i === 0 ? 'container+quantity+entity' : i === 1 ? 'container+quantity' : 'container-only';
              console.log(`Found box sentence match (${patternType}):`, sentenceMatch[1], 'at range:', [sentenceStart, sentenceEnd]);
              onMWPRangeHighlight!([[sentenceStart, sentenceEnd]]);
              return;
            }
          }
        }
        onMWPRangeHighlight!([]);
      }
    });
  }, [triggerHighlight, svgRef, componentMappings, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for text/quantity components
   */
  const triggerTextHighlight = useCallback((dslPath: string) => {
    triggerHighlight(dslPath, {
      icon: '📝',
      label: 'Text',
      applyVisualHighlight: () => {
        const quantityTextEl = svgRef.current?.querySelector(`text[data-dsl-path="${dslPath}"]`) as SVGElement;
        if (quantityTextEl) {
          quantityTextEl.style.fill = '#3b82f6';
          quantityTextEl.style.fontWeight = 'bold';
          quantityTextEl.style.filter = 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.8))';
        }
      },
      applyMWPHighlight: (mapping) => {
        const quantity = mapping?.property_value;
        
        if (quantity && mwpValue) {
          console.log('Text element - searching for quantity:', quantity);
          
          // Use utility function to find quantity in text
          const position = findQuantityInText(mwpValue, quantity);
          
          if (position && onMWPRangeHighlight) {
            const [start, end] = position;
            console.log(`Found text quantity at position [${start}, ${end}]`);
            onMWPRangeHighlight([[start, end]]);
          } else {
            console.log(`Text quantity not found: ${quantity}`);
            onMWPRangeHighlight!([]);
          }
        } else {
          onMWPRangeHighlight!([]);
        }
      }
    });
  }, [triggerHighlight, svgRef, mwpValue, onMWPRangeHighlight]);

  /**
   * Trigger highlighting for operation components
   */
  const triggerOperationHighlight = useCallback((dslPath: string) => {
    triggerHighlight(dslPath, {
      icon: '⚙️',
      label: 'Operation',
      applyVisualHighlight: () => {
        const operationEl = svgRef.current?.querySelector(`g[data-dsl-path="${dslPath}"]`) as SVGElement;
        if (operationEl) {
          operationEl.style.filter = 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))';
          operationEl.style.transform = 'scale(1.1)';
          operationEl.style.transformOrigin = 'center';
        }
      },
      applyMWPHighlight: () => {
        highlightSecondOperandSentence(dslPath);
      }
    });
  }, [triggerHighlight, svgRef, highlightSecondOperandSentence]);

  return {
    clearVisualHighlights,
    clearAllHighlights,
    triggerBoxHighlight,
    triggerTextHighlight,
    triggerOperationHighlight,
  };
};
