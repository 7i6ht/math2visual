import { useState, useCallback, useEffect, useRef } from 'react';

interface ComponentMapping {
  [componentId: string]: {
    dsl_path: string;
    dsl_range: [number, number];
    properties: Record<string, any>;
    type: string;
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
  dslValue: _dslValue,  // Currently unused, kept for future use
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
      const triggerHighlight = (componentId: string) => {
        setHoveredComponent(componentId);
        
        const mapping = componentMappings[componentId];
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
          
          // Highlight the interactive component box
          const targetComponent = Array.from(svgElements).find(el => 
            el.getAttribute('data-component-id') === componentId
          ) as SVGElement;
          
          if (targetComponent) {
            targetComponent.style.stroke = '#3b82f6';
            targetComponent.style.strokeWidth = '3';
            targetComponent.style.filter = 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))';
          }
          
          // Highlight text containing the quantity
          const quantity = mapping.properties?.item?.entity_quantity;
          if (quantity && svgRef.current) {
            const textElements = svgRef.current.querySelectorAll('text');
            textElements.forEach((textEl) => {
              const content = textEl.textContent;
              if (content && content.includes(quantity.toString())) {
                textEl.style.fill = '#3b82f6';
                textEl.style.fontWeight = 'bold';
                textEl.style.filter = 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.8))';
              }
            });
          }
          
          // Highlight in DSL editor
          if (onDSLRangeHighlight && mapping.dsl_range) {
            setTimeout(() => onDSLRangeHighlight(mapping.dsl_range), 0);
          }
          
          // Highlight in MWP text
          if (onMWPRangeHighlight) {
            const quantity = mapping.properties?.item?.entity_quantity;
            if (quantity && mwpValue) {
              const regex = new RegExp(`\\b${quantity}\\b`);
              const match = regex.exec(mwpValue);
              if (match) {
                setTimeout(() => onMWPRangeHighlight([match.index, match.index + match[0].length]), 0);
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
        
        // Remove existing listeners
        svgElem.onmouseenter = null;
        svgElem.onmouseleave = null;
        svgElem.onclick = null;
        
        // Add event listeners
        svgElem.onmouseenter = () => triggerHighlight(componentId);
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
            if (content && content.includes(quantity.toString())) {
              // Remove pointer-events: none for this specific text
              textEl.style.pointerEvents = 'auto';
              textEl.style.cursor = 'pointer';
              
              // Remove existing listeners
              textEl.onmouseenter = null;
              textEl.onmouseleave = null;
              textEl.onclick = null;
              
              // Add event listeners
              textEl.onmouseenter = () => triggerHighlight(componentId);
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
  }, [svgRef, componentMappings, onDSLRangeHighlight, onMWPRangeHighlight, onComponentClick, mwpValue]);
  
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
