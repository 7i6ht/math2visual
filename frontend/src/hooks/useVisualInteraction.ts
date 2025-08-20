import { useState, useCallback, useRef, useEffect } from 'react';

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
}

export const useVisualInteraction = ({
  svgRef,
  dslValue: _dslValue,  // Currently unused, kept for future use
  mwpValue,
  onDSLRangeHighlight,
  onMWPRangeHighlight,
}: UseVisualInteractionProps) => {
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentMappings, setComponentMappings] = useState<ComponentMapping>({});
  const previousHoveredRef = useRef<string | null>(null);
  
  const clearHighlights = useCallback(() => {
    if (!svgRef.current) return;
    
    // Clear all highlighted SVG elements
    const svgElements = svgRef.current.querySelectorAll('.interactive-component');
    svgElements.forEach(element => {
      const svgElem = element as SVGElement;
      svgElem.style.stroke = 'black';
      svgElem.style.strokeWidth = '1';
      svgElem.style.filter = '';
    });
  }, [svgRef]);
  
  const highlightComponent = useCallback((componentId: string) => {
    const mapping = componentMappings[componentId];
    if (!mapping) return;
    
    // Clear previous highlights
    if (previousHoveredRef.current && previousHoveredRef.current !== componentId) {
      clearHighlights();
    }
    previousHoveredRef.current = componentId;
    
    // Highlight in SVG
    const svgElement = svgRef.current?.querySelector(
      `[data-component-id="${componentId}"]`
    ) as SVGElement;
    if (svgElement) {
      svgElement.style.stroke = '#3b82f6';
      svgElement.style.strokeWidth = '3';
      svgElement.style.filter = 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))';
    }
    
    // Highlight in DSL editor
    if (onDSLRangeHighlight && mapping.dsl_range) {
      onDSLRangeHighlight(mapping.dsl_range);
    }
    
    // Highlight in MWP text (if mapping exists)
    // This would need entity extraction logic to find the corresponding text
    // For now, we'll just signal that highlighting should occur
    if (onMWPRangeHighlight) {
      // TODO: Implement MWP text range detection based on component properties
      // For example, find numbers that match entity_quantity
      const quantity = mapping.properties?.item?.entity_quantity;
      if (quantity && mwpValue) {
        const regex = new RegExp(`\\b${quantity}\\b`);
        const match = regex.exec(mwpValue);
        if (match) {
          onMWPRangeHighlight([match.index, match.index + match[0].length]);
        }
      }
    }
  }, [componentMappings, svgRef, clearHighlights, onDSLRangeHighlight, onMWPRangeHighlight, mwpValue]);
  
  const setupSVGInteractions = useCallback(() => {
    if (!svgRef.current) return;
    
    // Remove any existing listeners first
    const svgElements = svgRef.current.querySelectorAll('.interactive-component');
    
    svgElements.forEach(element => {
      const svgElem = element as SVGElement;
      
      // Clone element to remove all event listeners
      const newElem = svgElem.cloneNode(true) as SVGElement;
      svgElem.parentNode?.replaceChild(newElem, svgElem);
      
      // Add new event listeners
      newElem.addEventListener('mouseenter', (e) => {
        const target = e.target as SVGElement;
        const componentId = target.getAttribute('data-component-id');
        if (componentId) {
          setHoveredComponent(componentId);
          highlightComponent(componentId);
        }
      });
      
      newElem.addEventListener('mouseleave', () => {
        setHoveredComponent(null);
        clearHighlights();
        if (onDSLRangeHighlight) {
          onDSLRangeHighlight([0, 0]); // Clear DSL highlight
        }
        if (onMWPRangeHighlight) {
          onMWPRangeHighlight([0, 0]); // Clear MWP highlight
        }
      });
      
      newElem.addEventListener('click', (e) => {
        const target = e.target as SVGElement;
        const componentId = target.getAttribute('data-component-id');
        if (componentId) {
          setSelectedComponent(componentId);
          // Emit event for showing edit panel
          const rect = target.getBoundingClientRect();
          window.dispatchEvent(new CustomEvent('show-edit-panel', {
            detail: {
              componentId,
              position: { x: rect.right + 10, y: rect.top }
            }
          }));
        }
      });
      
      // Add cursor pointer on hover
      newElem.style.cursor = 'pointer';
    });
  }, [svgRef, highlightComponent, clearHighlights, onDSLRangeHighlight, onMWPRangeHighlight]);
  
  // Setup interactions when SVG content changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Small delay to ensure DOM is fully updated
      setTimeout(setupSVGInteractions, 100);
    });
    
    if (svgRef.current) {
      observer.observe(svgRef.current, {
        childList: true,
        subtree: true
      });
      
      // Initial setup
      setupSVGInteractions();
    }
    
    return () => observer.disconnect();
  }, [svgRef, setupSVGInteractions]);
  
  return {
    hoveredComponent,
    selectedComponent,
    componentMappings,
    setupSVGInteractions,
    setComponentMappings,
    clearHighlights,
    setSelectedComponent,
  };
};
