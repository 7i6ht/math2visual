import { useCallback, useMemo, useRef, useEffect } from 'react';
import { isTextElement, isBoxElement, isEmbeddedSvgElement, isContainerTypeSvgElement, isAttrTypeSvgElement, isContainerNameElement, isAttrNameElement } from '../utils/elementUtils';
import { useHighlightingContext } from '@/contexts/HighlightingContext';

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
      svgElem.onmouseenter = () => {
        const currentPath = currentDSLPathRef.current;
        if (currentPath !== dslPath) {
          setSelectedElement(svgElem);
        }
      };
      svgElem.onmouseleave = () => setSelectedElement(null as unknown as Element);
      svgElem.style.cursor = 'pointer';

      // Determine element type and setup appropriate interactions
      // Check smaller/internal elements first, then containers, to avoid event blocking
      if (isContainerNameElement(svgElem)) {
        svgElem.onclick = (event: MouseEvent) => {
          event.stopPropagation();
          onNameClick(event);
        };
      } else if (isAttrNameElement(svgElem)) {
        svgElem.onclick = (event: MouseEvent) => {
          event.stopPropagation();
          onNameClick(event);
        };
      } else if (isTextElement(svgElem)) {
        svgElem.style.pointerEvents = 'auto';
        // Add click handler for entity quantity editing if path ends with entity_quantity
        if (dslPath.endsWith('/entity_quantity')) {
          svgElem.onclick = (event: MouseEvent) => {
            event.stopPropagation();
            onEntityQuantityClick(event);
          };
        }
      } else if (isEmbeddedSvgElement(svgElem)) {
        svgElem.onclick = (event: MouseEvent) => {
          event.stopPropagation();
          onEmbeddedSVGClick(event);
        };
      } else if (isContainerTypeSvgElement(svgElem)) {
        svgElem.onclick = (event: MouseEvent) => {
          event.stopPropagation();
          onEmbeddedSVGClick(event);
        };
      } else if (isAttrTypeSvgElement(svgElem)) {
        svgElem.onclick = (event: MouseEvent) => {
          event.stopPropagation();
          onEmbeddedSVGClick(event);
        };
      } else if (isBoxElement(svgElem)) {
        svgElem.onclick = (event: MouseEvent) => {
          event.stopPropagation();
          onEntityQuantityClick(event);
        };
      }
    });
  }, [
    svgRef,
    isDisabled,
    setSelectedElement,
    onEmbeddedSVGClick,
    onEntityQuantityClick,
    onNameClick,
    isPopupOpen
  ]);

  const returnValue = useMemo(() => ({
    setupSVGInteractions,
  }), [setupSVGInteractions]);

  return returnValue;
};
