import { useState, useCallback, useEffect, useRef } from 'react';

interface ComponentMapping {
  [componentId: string]: {
    dsl_path: string; // Full hierarchical path like "division/subtraction/entities[0]"
    dsl_range: [number, number];
    properties: Record<string, any>;
  };
}

interface UseVisualInteractionProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  dslValue: string;
  mwpValue: string;
  onDSLRangeHighlight?: (range: [number, number]) => void;
  onMWPRangeHighlight?: (range: [number, number]) => void;
  onComponentClick?: (componentId: string, clickPosition: { x: number; y: number }) => void;
}

export const useVisualInteraction = ({
  svgRef,
  dslValue,
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
      const svgElements = svgRef.current.querySelectorAll('.interactive-component');
      
              // Helper function to trigger highlighting for a component
        const triggerHighlight = (componentId: string, highlightType: 'box' | 'text') => {
          console.log(`🎯 triggerHighlight called: ${componentId}, type: ${highlightType}`);
          setHoveredComponent(componentId);
          
          const mapping = componentMappings[componentId];
          console.log('Mapping for component:', componentId, mapping);
          if (mapping) {
          // Clear previous highlights
          const allElements = svgRef.current?.querySelectorAll('.interactive-component');
          allElements?.forEach(elem => {
            const e = elem as SVGElement;
            e.style.stroke = 'black';
            e.style.strokeWidth = '1';
            e.style.filter = '';
          });
          
          // Clear previous text highlights
          const allTextElements = svgRef.current?.querySelectorAll('text');
          allTextElements?.forEach(textEl => {
            textEl.style.fill = 'black';
            textEl.style.fontWeight = 'normal';
            textEl.style.filter = '';
          });
          
          if (highlightType === 'box') {
            // ONLY highlight the interactive component box (not text)
            const targetComponent = Array.from(svgElements).find(el => 
              el.getAttribute('data-component-id') === componentId
            ) as SVGElement;
            
            if (targetComponent) {
              targetComponent.style.stroke = '#3b82f6';
              targetComponent.style.strokeWidth = '3';
              targetComponent.style.filter = 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))';
            }
            // Explicitly ensure text stays black for box hover
            const quantity = mapping.properties?.item?.entity_quantity;
            console.log(`🔲 BOX HOVER: Forcing text ${quantity} to black`);
            if (quantity && svgRef.current) {
              const textElements = svgRef.current.querySelectorAll('text');
              textElements.forEach((textEl) => {
                const content = textEl.textContent;
                if (content && content.trim() === quantity.toString()) {
                  console.log(`🔲 Found text element with "${content}" - setting to black`);
                  textEl.style.fill = 'black';
                  textEl.style.fontWeight = 'normal';
                  textEl.style.filter = '';
                }
              });
            }
                      } else if (highlightType === 'text') {
              // ONLY highlight text containing the quantity (not box)
              const quantity = mapping.properties?.item?.entity_quantity;
              if (quantity && svgRef.current) {
                const textElements = svgRef.current.querySelectorAll('text');
                textElements.forEach((textEl) => {
                  const content = textEl.textContent;
                  if (content && content.trim() === quantity.toString()) {
                    textEl.style.fill = '#3b82f6';
                    textEl.style.fontWeight = 'bold';
                    textEl.style.filter = 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.8))';
                  }
                });
              }
            // Explicitly ensure box stays black for text hover
            const targetComponent = Array.from(svgElements).find(el => 
              el.getAttribute('data-component-id') === componentId
            ) as SVGElement;
            
            if (targetComponent) {
              targetComponent.style.stroke = 'black';
              targetComponent.style.strokeWidth = '1';
              targetComponent.style.filter = '';
            }
          }
          
          // Highlight in DSL editor using backend-provided ranges
          if (onDSLRangeHighlight) {
            if (highlightType === 'text') {
              // For text hover: find entity_quantity property specifically
              const quantity = mapping.properties?.item?.entity_quantity;
              console.log(`📝 TEXT HOVER DSL: Looking for quantity ${quantity} in DSL`);
              
              if (quantity) {
                // Search for the specific quantity pattern in the formatted DSL
                const quantityPattern = new RegExp(`entity_quantity:\\s*${quantity}\\b`);
                const match = quantityPattern.exec(dslValue);
                
                if (match) {
                  const propertyStart = match.index;
                  const propertyEnd = match.index + match[0].length;
                  console.log('✅ Text hover - found quantity property at range:', [propertyStart, propertyEnd]);
                  setTimeout(() => onDSLRangeHighlight([propertyStart, propertyEnd]), 0);
                } else {
                  // Use backend range as fallback
                  console.log('📝 Text hover - using backend range as fallback:', mapping.dsl_range);
                  setTimeout(() => onDSLRangeHighlight(mapping.dsl_range || [0, 0]), 0);
                }
              }
            } else {
              // For box hover: use backend-provided range directly
              console.log('🔲 Box hover - using backend range:', mapping.dsl_range);
              setTimeout(() => onDSLRangeHighlight(mapping.dsl_range || [0, 0]), 0);
            }
          }
          
          // Highlight in MWP text based on specificity level
          if (onMWPRangeHighlight) {
            if (highlightType === 'text') {
              // For text hover: highlight only the number
              const quantity = mapping.properties?.item?.entity_quantity;
              if (quantity && mwpValue) {
                const regex = new RegExp(`\\b${quantity}\\b`);
                const match = regex.exec(mwpValue);
                if (match) {
                  setTimeout(() => onMWPRangeHighlight([match.index, match.index + match[0].length]), 0);
                }
              }
            } else {
              // For box hover: highlight the entire sentence for this container
              const containerName = mapping.properties?.container_name;
              const entityName = mapping.properties?.item?.entity_name;
              const quantity = mapping.properties?.item?.entity_quantity;
              
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
                    setTimeout(() => onMWPRangeHighlight([sentenceStart, sentenceEnd]), 0);
                    break;
                  }
                }
              }
            }
          }
        }
      };
      
      // Helper function to clear all highlights
      const clearHighlights = () => {
        setHoveredComponent(null);
        
        // Clear component highlights
        const allElements = svgRef.current?.querySelectorAll('.interactive-component');
        allElements?.forEach(elem => {
          const e = elem as SVGElement;
          e.style.stroke = 'black';
          e.style.strokeWidth = '1';
          e.style.filter = '';
        });
        
        // Clear text highlights
        const allTextElements = svgRef.current?.querySelectorAll('text');
        allTextElements?.forEach(textEl => {
          textEl.style.fill = 'black';
          textEl.style.fontWeight = 'normal';
          textEl.style.filter = '';
        });
        
        // Clear DSL and MWP highlights
        if (onDSLRangeHighlight) {
          setTimeout(() => onDSLRangeHighlight([0, 0]), 0);
        }
        if (onMWPRangeHighlight) {
          setTimeout(() => onMWPRangeHighlight([0, 0]), 0);
        }
      };
      
              // Set up interactions on interactive components (boxes)
        svgElements.forEach((element) => {
          const svgElem = element as SVGElement;
          const componentId = svgElem.getAttribute('data-component-id');
          
          if (!componentId) return;
          
          console.log(`📦 Setting up BOX listeners for: ${componentId}`);
          
          // Remove existing listeners
          svgElem.onmouseenter = null;
          svgElem.onmouseleave = null;
          svgElem.onclick = null;
          
          // Add event listeners
          svgElem.onmouseenter = () => {
            console.log(`📦 BOX MOUSEENTER: ${componentId}`);
            triggerHighlight(componentId, 'box');
          };
          svgElem.onmouseleave = clearHighlights;
          svgElem.onclick = () => {
            setSelectedComponent(componentId);
            if (onComponentClick) {
              const rect = svgElem.getBoundingClientRect();
              onComponentClick(componentId, { x: rect.right + 10, y: rect.top });
            }
          };
          
          svgElem.style.cursor = 'pointer';
        });
      
              // ALSO set up interactions on text elements that contain quantities
        Object.entries(componentMappings).forEach(([componentId, mapping]) => {
          const quantity = mapping.properties?.item?.entity_quantity;
          if (quantity && svgRef.current) {
            const textElements = svgRef.current.querySelectorAll('text');
            textElements.forEach((textEl) => {
              const content = textEl.textContent;
              if (content && content.trim() === quantity.toString()) {
                console.log(`📝 Setting up TEXT listeners for: ${componentId} (quantity: ${quantity})`);
                
                // Remove pointer-events: none for this specific text
                textEl.style.pointerEvents = 'auto';
                textEl.style.cursor = 'pointer';
                
                // Remove existing listeners
                textEl.onmouseenter = null;
                textEl.onmouseleave = null;
                textEl.onclick = null;
                
                // Add event listeners
                textEl.onmouseenter = () => {
                  console.log(`📝 TEXT MOUSEENTER: ${componentId} (content: "${content}")`);
                  triggerHighlight(componentId, 'text');
                };
                textEl.onmouseleave = clearHighlights;
                textEl.onclick = () => {
                  setSelectedComponent(componentId);
                  if (onComponentClick) {
                    const rect = textEl.getBoundingClientRect();
                    onComponentClick(componentId, { x: rect.right + 10, y: rect.top });
                  }
                };
              }
            });
          }
        });
      
    } finally {
      // Always reset the flag, even if there's an error
      setupInProgressRef.current = false;
    }
  }, [svgRef, componentMappings, onDSLRangeHighlight, onMWPRangeHighlight, onComponentClick, mwpValue, dslValue]);
  
  // Setup interactions - simple approach, only when mappings change
  useEffect(() => {
    if (Object.keys(componentMappings).length > 0 && svgRef.current) {
      // Small delay to ensure SVG is fully rendered
      const timeoutId = setTimeout(setupSVGInteractions, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [componentMappings, setupSVGInteractions]);
  
  return {
    hoveredComponent,
    selectedComponent,
    componentMappings,
    setupSVGInteractions,
    setComponentMappings,
    setSelectedComponent,
  };
};
