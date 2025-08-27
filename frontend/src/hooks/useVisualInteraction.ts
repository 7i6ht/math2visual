import { useState, useCallback, useEffect, useRef } from 'react';
import { ToWords } from 'to-words';

interface ComponentMapping {
  [dslPath: string]: {
    dsl_range: [number, number];
    property_value?: string; // Only set if this dsl path represents a property
  };
}

interface UseVisualInteractionProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  mwpValue: string;
  onDSLRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onMWPRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onComponentClick?: (dslPath: string, clickPosition: { x: number; y: number }) => void;
}

export const useVisualInteraction = ({
  svgRef,
  mwpValue,
  onDSLRangeHighlight,
  onMWPRangeHighlight,
  onComponentClick,
}: UseVisualInteractionProps) => {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentMappings, setComponentMappingsInternal] = useState<ComponentMapping>({});
  const setupInProgressRef = useRef(false);

  const setComponentMappings = useCallback((mappings: ComponentMapping) => {
    setComponentMappingsInternal(mappings);
  }, []);



  const setupSVGInteractions = useCallback(() => {
    // Prevent infinite loops with ref
    if (setupInProgressRef.current || !svgRef.current) {
      return;
    }

    setupInProgressRef.current = true;

    try {

      // Element type helpers (keep logic consistent everywhere)
      const isTextElement = (el: Element): boolean => el.tagName.toLowerCase() === 'text';
      const isOperationElement = (el: Element): boolean => {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'g') return false;
        const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
        return path.includes('/operation') || path === 'operation';
      };
      const isBoxElement = (el: Element): boolean => el.tagName.toLowerCase() === 'rect';

      // Helper function to clear visual highlights only (no state changes)
      const clearVisualHighlights = () => {
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
      };

      // Base function for triggering highlighting with common logic
      const triggerHighlight = (
        dslPath: string,
        config: {
          icon: string;
          label: string;
          applyVisualHighlight: (mapping: any) => void;
          applyMWPHighlight: (mapping: any) => void;
        }
      ) => {
        console.log(`${config.icon} trigger${config.label}Highlight called: ${dslPath}`);
        setHoveredComponent(dslPath);

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
      };

      // Helper function to trigger highlighting for box components
      const triggerBoxHighlight = (dslPath: string) => {
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
              // Convert quantity to both numeric and word forms for regex matching
              const numericQuantity = quantity ? quantity.toString() : '';
              const wordQuantity = quantity ? numberToWord(parseInt(quantity.toString())) : '';
              
              // Create quantity pattern that matches either numeric or word form
              const quantityPattern = quantity ? `(${numericQuantity}|${wordQuantity})` : '';
              
              console.log('Box element - quantity forms for regex:', { numeric: numericQuantity, word: wordQuantity, pattern: quantityPattern });
              
              const sentencePatterns = [
                // Pattern with container + quantity + entity
                quantity ? new RegExp(`([^.!?]*${containerName}[^.!?]*${quantityPattern}[^.!?]*${entityName}[^.!?]*[.!?])`, 'i') : null,
                // Pattern with container + quantity (no entity requirement)
                quantity ? new RegExp(`([^.!?]*${containerName}[^.!?]*${quantityPattern}[^.!?]*[.!?])`, 'i') : null,
                // Fallback pattern with just container (if quantity patterns fail)
                new RegExp(`([^.!?]*${containerName}[^.!?]*[.!?])`, 'i')
              ].filter(Boolean); // Remove null patterns

              for (let i = 0; i < sentencePatterns.length; i++) {
                const pattern = sentencePatterns[i] as RegExp; // Safe after .filter(Boolean)
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
      };

      // Helper function to trigger highlighting for text components
      const triggerTextHighlight = (dslPath: string) => {
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
              // Convert quantity to both numeric and word forms for searching
              const numericQuantity = quantity.toString();
              const wordQuantity = numberToWord(parseInt(quantity.toString()));
              
              console.log('Text element - searching for quantity in forms:', { numeric: numericQuantity, word: wordQuantity });
              
              // Try to find numeric form first
              let regex = new RegExp(`\\b${numericQuantity}\\b`);
              let match = regex.exec(mwpValue);
              
              if (match) {
                console.log(`Found text quantity (numeric form): "${numericQuantity}" at position ${match.index}`);
                onMWPRangeHighlight!([[match.index, match.index + match[0].length]]);
                return;
              }
              
              // If numeric form not found, try word form
              regex = new RegExp(`\\b${wordQuantity}\\b`, 'i'); // case-insensitive
              match = regex.exec(mwpValue);
              
              if (match) {
                console.log(`Found text quantity (word form): "${wordQuantity}" at position ${match.index}`);
                onMWPRangeHighlight!([[match.index, match.index + match[0].length]]);
                return;
              }
              
              console.log(`Text quantity not found in either form: numeric="${numericQuantity}", word="${wordQuantity}"`);
              onMWPRangeHighlight!([]);
            } else {
              onMWPRangeHighlight!([]);
            }
          }
        });
      };

      // Helper function to trigger highlighting for operation components
      const triggerOperationHighlight = (dslPath: string) => {
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
      };

      // Helper function to convert numbers to words using to-words library
      const toWords = new ToWords();
      const numberToWord = (num: number): string => {
        try {
          return toWords.convert(num);
        } catch (error) {
          console.warn('Failed to convert number to word:', num, error);
          return num.toString(); // fallback to numeric form
        }
      };

      // Helper function to find and highlight the sentence containing the second operand
      const highlightSecondOperandSentence = (operationDslPath: string) => {
        if (!mwpValue) return;

        // Extract operation type from DSL path
        const operationType = componentMappings[operationDslPath]?.property_value;
        
        // Find the second operand's value by looking for sibling entities 
        const secondOperandPath = `${operationDslPath}/entities[1]`;
        
        // Look for quantity in the second operand
        const secondOperandQuantityPath = `${secondOperandPath}/entity_quantity`;
        const secondOperandQuantity = componentMappings[secondOperandQuantityPath]?.property_value;
        
        console.log('🔍 DEBUGGING MWP: Operation DSL path:', operationDslPath);
        console.log('🔍 DEBUGGING MWP: Second operand path:', secondOperandPath);  
        console.log('🔍 DEBUGGING MWP: Second operand quantity path:', secondOperandQuantityPath);
        console.log('🔍 DEBUGGING MWP: Available component mappings:', Object.keys(componentMappings));
        console.log('Operation type:', operationType, 'Second operand quantity:', secondOperandQuantity);
        
        if (secondOperandQuantity) {
          // Find sentence containing the second operand value
          const sentences = mwpValue.split(/[.!?]+/).filter(s => s.trim().length > 0);
          
          // Convert quantity to both numeric and word forms for searching
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
              
              // Calculate the position of this sentence in the full text
              let sentenceStart = 0;
              for (let j = 0; j < i; j++) {
                sentenceStart += sentences[j].length + 1; // +1 for the separator
              }
              
              // Find the actual start position in the original text
              const actualSentenceMatch = mwpValue.substring(sentenceStart).match(new RegExp(`\\s*${sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
              if (actualSentenceMatch && actualSentenceMatch.index !== undefined) {
                const actualStart = sentenceStart + actualSentenceMatch.index;
                const actualEnd = actualStart + actualSentenceMatch[0].length;
                console.log('Found second operand sentence:', sentence, 'at range:', [actualStart, actualEnd]);
                if (onMWPRangeHighlight) {
                  onMWPRangeHighlight([[actualStart, actualEnd]]);
                }
                return;
              }
            }
          }
        }
      };

      // Helper function to clear all highlights
      const clearHighlights = () => {
        setHoveredComponent(null);
        clearVisualHighlights();

        // Clear DSL and MWP highlights
        if (onDSLRangeHighlight) {
          onDSLRangeHighlight([]);
        }
        if (onMWPRangeHighlight) {
          onMWPRangeHighlight([]);
        }
      };

      // Helper function to setup event listeners for elements
      const setupElementListeners = (
        svgElem: SVGElement,
        dslPath: string,
        config: {
          icon: string;
          label: string;
          onMouseEnter: () => void;
          onClickTarget?: string;
          extraSetup?: () => void;
        }
      ) => {
        console.log(`${config.icon} Setting up ${config.label} listeners for: ${dslPath}`);

        // Remove existing listeners
        svgElem.onmouseenter = null;
        svgElem.onmouseleave = null;
        svgElem.onclick = null;

        // Add event listeners
        svgElem.onmouseenter = config.onMouseEnter;
        svgElem.onmouseleave = clearHighlights;
        svgElem.onclick = () => {
          const targetPath = config.onClickTarget || dslPath;
          setSelectedComponent(targetPath);
          if (onComponentClick) {
            const rect = svgElem.getBoundingClientRect();
            onComponentClick(targetPath, { x: rect.right + 10, y: rect.top });
          }
        };

        svgElem.style.cursor = 'pointer';
        config.extraSetup?.();
      };

      // Set up interactions on all elements with DSL paths (both boxes and text)
      const allInteractiveElements = svgRef.current?.querySelectorAll('[data-dsl-path]');
      allInteractiveElements?.forEach((element) => {
        const svgElem = element as SVGElement;
        const dslPath = svgElem.getAttribute('data-dsl-path');

        if (!dslPath) return;

        const textEl = isTextElement(svgElem);
        const opEl = isOperationElement(svgElem);
        const boxEl = isBoxElement(svgElem);

        if (opEl) {
          setupElementListeners(svgElem, dslPath, {
            icon: '⚙️',
            label: 'OPERATION',
            onMouseEnter: () => {
              console.log(`⚙️ OPERATION MOUSEENTER: ${dslPath}`);
              triggerOperationHighlight(dslPath);
            }
          });

        } else if (boxEl) {
          setupElementListeners(svgElem, dslPath, {
            icon: '📦',
            label: 'BOX',
            onMouseEnter: () => {
              console.log(`📦 BOX MOUSEENTER: ${dslPath}`);
              triggerBoxHighlight(dslPath);
            }
          });

        } else if (textEl) {
          const quantityDslPath = dslPath;
          const entityDslPath = quantityDslPath.replace('/entity_quantity', '');
          
          setupElementListeners(svgElem, dslPath, {
            icon: '📝',
            label: 'TEXT',
            onMouseEnter: () => {
              console.log(`📝 TEXT MOUSEENTER: ${quantityDslPath} -> triggering for entity: ${entityDslPath}`);
              triggerTextHighlight(quantityDslPath);
            },
            onClickTarget: entityDslPath,
            extraSetup: () => {
              svgElem.style.pointerEvents = 'auto';
            }
          });
        }
      });

    } finally {
      // Always reset the flag, even if there's an error
      setupInProgressRef.current = false;
    }
  }, [svgRef, componentMappings, onDSLRangeHighlight, onMWPRangeHighlight, onComponentClick, mwpValue]);

  // Setup interactions when mappings change
  useEffect(() => {
    if (Object.keys(componentMappings).length > 0 && svgRef.current) {
      setupSVGInteractions();
    }
  }, [componentMappings, setupSVGInteractions, svgRef]);

  return {
    hoveredComponent,
    selectedComponent,
    componentMappings,
    setupSVGInteractions,
    setComponentMappings,
    setSelectedComponent,
  };
};
