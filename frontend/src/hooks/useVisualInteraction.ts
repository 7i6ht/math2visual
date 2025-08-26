import { useState, useCallback, useEffect, useRef } from 'react';

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

      // Helper function to clear visual highlights only (no state changes)
      const clearVisualHighlights = () => {
        const allInteractiveElements = svgRef.current?.querySelectorAll('[data-dsl-path]');
        allInteractiveElements?.forEach(elem => {
          const isTextElement = elem.tagName.toLowerCase() === 'text';

          if (isTextElement) {
            // Clear text highlights
            (elem as SVGElement).style.fill = 'white';
            (elem as SVGElement).style.filter = '';
          } else {
            // Clear box highlights
            (elem as SVGElement).style.stroke = 'black';
            (elem as SVGElement).style.strokeWidth = '1';
            (elem as SVGElement).style.filter = '';
          }
        });
      };

      // Helper function to trigger highlighting for box components
      const triggerBoxHighlight = (dslPath: string) => {
        console.log(`🔲 triggerBoxHighlight called: ${dslPath}`);
        setHoveredComponent(dslPath);

        const mapping = componentMappings[dslPath];
        console.log('Mapping for component:', dslPath, mapping);
        if (mapping) {
          // Clear previous highlights
          clearVisualHighlights();

          // Highlight the box element
          const targetBox = svgRef.current?.querySelector(`[data-dsl-path="${dslPath}"]:not(text)`) as SVGElement;
          if (targetBox) {
            targetBox.style.stroke = '#3b82f6';
            targetBox.style.strokeWidth = '3';
            targetBox.style.filter = 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))';
          }

          // Highlight in DSL editor using hierarchical mapping
          if (onDSLRangeHighlight) {
            console.log('🔲 BOX hover - using entity range:', mapping.dsl_range);
            onDSLRangeHighlight(mapping.dsl_range ? [mapping.dsl_range] : []);
          }

          // MWP highlighting using new component system with property values
          // For box hover: highlight the entire sentence using stored property values
          if (onMWPRangeHighlight) {
            const containerNamePath = `${dslPath}/container_name`;
            const entityNamePath = `${dslPath}/entity_name`;
            const quantityPath = `${dslPath}/entity_quantity`;
            
            const containerName = componentMappings[containerNamePath]?.property_value;
            const entityName = componentMappings[entityNamePath]?.property_value;
            const quantity = componentMappings[quantityPath]?.property_value;

            console.log('Box hover - looking for sentence with:', { containerName, entityName, quantity });

            if (containerName && mwpValue) {
              // Try to find the sentence containing this container's information
              // Look for pattern: "ContainerName [verb] quantity entityName"
              const sentencePatterns = [
                // "Faye picked 88 colorful flowers."
                new RegExp(`([^.!?]*${containerName}[^.!?]*${quantity}[^.!?]*${entityName}[^.!?]*[.!?])`, 'i'),
                // "Faye picked 88 flowers."
                new RegExp(`([^.!?]*${containerName}[^.!?]*${quantity}[^.!?]*[.!?])`, 'i'),
                // Fallback: just the container name sentence
                new RegExp(`([^.!?]*${containerName}[^.!?]*[.!?])`, 'i')
              ];

              for (const pattern of sentencePatterns) {
                const sentenceMatch = pattern.exec(mwpValue);
                if (sentenceMatch) {
                  const sentenceStart = sentenceMatch.index;
                  const sentenceEnd = sentenceStart + sentenceMatch[1].length;
                  console.log('Found sentence match:', sentenceMatch[1], 'at range:', [sentenceStart, sentenceEnd]);
                  onMWPRangeHighlight([[sentenceStart, sentenceEnd]]);
                  return; // Exit early when match found
                }
              }
            }
            
            // If no match found, clear highlights
            onMWPRangeHighlight([]);
          }
        }
      };

      // Helper function to trigger highlighting for text components
      const triggerTextHighlight = (dslPath: string) => {
        console.log(`📝 triggerTextHighlight called: ${dslPath}`);
        setHoveredComponent(dslPath);

        const mapping = componentMappings[dslPath];
        console.log('Mapping for component:', dslPath, mapping);
        if (mapping) {
          // Clear previous highlights
          clearVisualHighlights();

          // Highlight the quantity text
          const quantityTextEl = svgRef.current?.querySelector(`text[data-dsl-path="${dslPath}"]`) as SVGElement;
          if (quantityTextEl) {
            quantityTextEl.style.fill = '#3b82f6';
            quantityTextEl.style.fontWeight = 'bold';
            quantityTextEl.style.filter = 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.8))';
          }

          // Highlight in DSL editor using hierarchical mapping
          if (onDSLRangeHighlight) {
            console.log('📝 TEXT hover - using entity range:', mapping.dsl_range);
            onDSLRangeHighlight(mapping.dsl_range ? [mapping.dsl_range] : []);
          }

          // MWP highlighting using new component system with property values
          // For text hover: highlight only the number using stored property value
          if (onMWPRangeHighlight) {
            const quantityMapping = componentMappings[dslPath];
            const quantity = quantityMapping?.property_value;
            
            if (quantity && mwpValue) {
              const regex = new RegExp(`\\b${quantity}\\b`);
              const match = regex.exec(mwpValue);
              if (match) {
                onMWPRangeHighlight([[match.index, match.index + match[0].length]]);
              } else {
                onMWPRangeHighlight([]);
              }
            } else {
              onMWPRangeHighlight([]);
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

      // Set up interactions on all elements with DSL paths (both boxes and text)
      const allInteractiveElements = svgRef.current?.querySelectorAll('[data-dsl-path]');
      allInteractiveElements?.forEach((element) => {
        const svgElem = element as SVGElement;
        const dslPath = svgElem.getAttribute('data-dsl-path');

        if (!dslPath) return;

        const isTextElement = svgElem.tagName.toLowerCase() === 'text';
        const isBoxElement = !isTextElement;

        if (isBoxElement) {
          // Handle box/rectangle elements
          console.log(`📦 Setting up BOX listeners for: ${dslPath}`);

          // Remove existing listeners
          svgElem.onmouseenter = null;
          svgElem.onmouseleave = null;
          svgElem.onclick = null;

          // Add event listeners
          svgElem.onmouseenter = () => {
            console.log(`📦 BOX MOUSEENTER: ${dslPath}`);
            triggerBoxHighlight(dslPath);
          };
          svgElem.onmouseleave = clearHighlights;
          svgElem.onclick = () => {
            setSelectedComponent(dslPath);
            if (onComponentClick) {
              const rect = svgElem.getBoundingClientRect();
              onComponentClick(dslPath, { x: rect.right + 10, y: rect.top });
            }
          };

          svgElem.style.cursor = 'pointer';

        } else if (isTextElement) {
          // Handle text elements (quantity text)
          const quantityDslPath = dslPath;
          // Extract entity DSL path from quantity path (remove /entity_quantity)
          const entityDslPath = quantityDslPath.replace('/entity_quantity', '');

          console.log(`📝 Setting up TEXT listeners for quantity: ${quantityDslPath} -> entity: ${entityDslPath}`);

          // Ensure text is interactive
          svgElem.style.pointerEvents = 'auto';
          svgElem.style.cursor = 'pointer';

          // Remove existing listeners
          svgElem.onmouseenter = null;
          svgElem.onmouseleave = null;
          svgElem.onclick = null;

          // Add event listeners using entity DSL path for mapping lookup
          svgElem.onmouseenter = () => {
            console.log(`📝 TEXT MOUSEENTER: ${quantityDslPath} -> triggering for entity: ${entityDslPath}`);
            triggerTextHighlight(quantityDslPath);
          };
          svgElem.onmouseleave = clearHighlights;
          svgElem.onclick = () => {
            setSelectedComponent(entityDslPath);
            if (onComponentClick) {
              const rect = svgElem.getBoundingClientRect();
              onComponentClick(entityDslPath, { x: rect.right + 10, y: rect.top });
            }
          };
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
