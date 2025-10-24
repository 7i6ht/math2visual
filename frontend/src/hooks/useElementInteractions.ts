import { useCallback, useMemo, useRef, useEffect } from 'react';
import { isTextElement, isBoxElement, isEmbeddedSvgElement, isContainerTypeSvgElement, isAttrTypeSvgElement, isContainerNameElement, isAttrNameElement } from '../utils/elementUtils';
import { useHighlightingContext } from '@/contexts/HighlightingContext';
import { useAnalytics } from './useAnalytics';

interface UseElementInteractionsProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  onEmbeddedSVGClick: (event: MouseEvent) => void;
  onEntityQuantityClick: (event: MouseEvent) => void;
  onNameClick: (event: MouseEvent) => void;
  isPopupOpen?: boolean;
  isDisabled?: boolean;
}

/**
 * Hook for managing SVG element interactions and event listeners
 * Handles setup of mouse events, click handlers, and element-specific behaviors
 */
export const useElementInteractions = ({
  svgRef,
  onEmbeddedSVGClick,
  onEntityQuantityClick,
  onNameClick,
  isPopupOpen = false,
  isDisabled = false,
}: UseElementInteractionsProps) => {
  const { currentDSLPath, setSelectedElement } = useHighlightingContext();
  const { trackElementHover, trackSVGElementClick, isAnalyticsEnabled } = useAnalytics();
  const currentDSLPathRef = useRef(currentDSLPath);
  
  // Keep the ref in sync with the current value
  useEffect(() => {
    currentDSLPathRef.current = currentDSLPath;
  }, [currentDSLPath]);
  /**
   * Setup interactions for all SVG elements with DSL paths
   */
  const setupSVGInteractions = useCallback(() => {
    if (!svgRef.current) {
      return;
    }

    // Find all elements with DSL paths
    const allInteractiveElements = svgRef.current.querySelectorAll('[data-dsl-path]');

    allInteractiveElements.forEach((element) => {
      const svgElem = element as SVGElement;
      const dslPath = svgElem.getAttribute('data-dsl-path');

      if (!dslPath) return;

      svgElem.onmouseenter = null;
      svgElem.onmouseleave = null;
      svgElem.onclick = null;
      svgElem.style.cursor = 'default';

      // If popup is open or disabled, don't set up hover listeners
      if (isPopupOpen || isDisabled) {
        return;
      }
  
      // Add event listeners
      // Track hover analytics if enabled
      if (isAnalyticsEnabled) {
        const elementType = svgElem.tagName.toLowerCase();
        const elementId = svgElem.id || `${elementType}-${dslPath.replace(/\//g, '-')}`;
         svgElem.onmouseenter = () => {
           const currentPath = currentDSLPathRef.current;
           if (currentPath !== dslPath) {
             trackElementHover(elementId, elementType, 'enter', dslPath);
             setSelectedElement(svgElem);
           }
         };
         svgElem.onmouseleave = () => {
           trackElementHover(elementId, elementType, 'leave', dslPath);
           setSelectedElement(null as unknown as Element);
         };
      } else {
        svgElem.onmouseenter = () => {
          const currentPath = currentDSLPathRef.current;
          if (currentPath !== dslPath) {
            setSelectedElement(svgElem);
          }
        };
        svgElem.onmouseleave = () => setSelectedElement(null as unknown as Element);
      }

      svgElem.style.cursor = 'pointer';

      // Determine element type and setup appropriate interactions
      // Check smaller/internal elements first, then containers, to avoid event blocking
      if (isContainerNameElement(svgElem) || isAttrNameElement(svgElem)) {
        svgElem.onclick = (event: PointerEvent) => {
          event.stopPropagation();
          onNameClick(event);
        };
      } else if (isTextElement(svgElem)) {
        svgElem.style.pointerEvents = 'auto';
        // Add click handler for entity quantity editing if path ends with entity_quantity
        if (dslPath.endsWith('/entity_quantity')) {
          svgElem.onclick = (event: PointerEvent) => {
            event.stopPropagation();
            onEntityQuantityClick(event);
          };
        }
      } else if (isEmbeddedSvgElement(svgElem) || isContainerTypeSvgElement(svgElem) || isAttrTypeSvgElement(svgElem)) {
        svgElem.onclick = (event: PointerEvent) => {
          event.stopPropagation();
          onEmbeddedSVGClick(event);
        };
      } else if (isBoxElement(svgElem)) {
        svgElem.onclick = (event: PointerEvent) => {
          event.stopPropagation();
          onEntityQuantityClick(event);
        };
      }

      if (svgElem.onclick && isAnalyticsEnabled) {
        const originalClickHandler = svgElem.onclick;
        svgElem.onclick = (event: PointerEvent) => {
          const elementType = svgElem.tagName.toLowerCase();
          const elementId = svgElem.id || `${elementType}-${dslPath.replace(/\//g, '-')}`;
          trackSVGElementClick(elementId, elementType, dslPath);
          originalClickHandler.call(svgElem, event);
        };
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    svgRef,
    isDisabled,
    setSelectedElement,
    onEmbeddedSVGClick,
    onEntityQuantityClick,
    onNameClick,
    isPopupOpen
    // trackElementHover and isAnalyticsEnabled are stable references and don't need to be dependencies
  ]);

  const returnValue = useMemo(() => ({
    setupSVGInteractions,
  }), [setupSVGInteractions]);

  return returnValue;
};
