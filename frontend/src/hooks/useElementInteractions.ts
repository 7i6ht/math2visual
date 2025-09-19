import { useCallback, useMemo } from 'react';
import { isTextElement, isOperationElement, isBoxElement, isEmbeddedSvgElement, isContainerTypeSvgElement, isContainerNameElement, isResultContainerElement, getDslPath, setCursorStyle } from '../utils/elementUtils';

interface UseElementInteractionsProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  highlighting: {
    clearAllHighlights: () => void;
    triggerBoxHighlight: (dslPath: string) => void;
    triggerEntityQuantityHighlight: (dslPath: string) => void;
    triggerOperationHighlight: (dslPath: string) => void;
    triggerEmbeddedSvgHighlight: (dslPath: string) => void;
    triggerContainerTypeHighlight: (dslPath: string) => void;
    triggerContainerNameHighlight: (dslPath: string) => void;
    triggerResultContainerHighlight: (dslPath: string) => void;
  };
  onEmbeddedSVGClick: (dslPath: string, event: MouseEvent) => void;
  isSelectorOpen?: boolean;
}

interface ElementListenerConfig {
  icon: string;
  label: string;
  onMouseEnter: () => void;
  onClickTarget?: string;
  extraSetup?: () => void;
}

/**
 * Hook for managing SVG element interactions and event listeners
 * Handles setup of mouse events, click handlers, and element-specific behaviors
 */
export const useElementInteractions = ({
  svgRef,
  highlighting,
  onEmbeddedSVGClick,
  isSelectorOpen = false,
}: UseElementInteractionsProps) => {
  /**
   * Clear all highlights and reset hover state
   */
  const clearHighlights = useCallback(() => {
    highlighting.clearAllHighlights();
  }, [highlighting]);


  /**
   * Setup mouseenter and related listeners for a specific SVG element
   */
  const setupMouseEnterListener = useCallback((
    svgElem: SVGElement,
    dslPath: string,
    config: ElementListenerConfig
  ) => {
    // Remove existing listeners
    svgElem.onmouseenter = null;
    svgElem.onmouseleave = null;
    svgElem.onclick = null;

    // If selector is open, don't set up hover listeners
    if (isSelectorOpen) { 
      return; 
    }

    // Add event listeners
    svgElem.onmouseenter = config.onMouseEnter;
    svgElem.onmouseleave = clearHighlights;

    setCursorStyle(svgElem, 'pointer');
    config.extraSetup?.();
  }, [clearHighlights, isSelectorOpen]);

  /**
   * Setup operation element interactions
   */
  const setupOperationElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, dslPath, {
      icon: '⚙️',
      label: 'OPERATION',
      onMouseEnter: () => {
        highlighting.triggerOperationHighlight(dslPath);
      }
    });
  }, [setupMouseEnterListener, highlighting]);

  /**
   * Setup box element interactions
   */
  const setupBoxElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, dslPath, {
      icon: '📦',
      label: 'BOX',
      onMouseEnter: () => {
        highlighting.triggerBoxHighlight(dslPath);
      }
    });
  }, [setupMouseEnterListener, highlighting]);

  /**
   * Setup text element interactions
   */
  const setupTextElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    const quantityDslPath = dslPath;
    const entityDslPath = quantityDslPath.replace('/entity_quantity', '');
    
    setupMouseEnterListener(svgElem, dslPath, {
      icon: '📝',
      label: 'TEXT',
      onMouseEnter: () => {
        highlighting.triggerEntityQuantityHighlight(quantityDslPath);
      },
      onClickTarget: entityDslPath,
      extraSetup: () => {
        svgElem.style.pointerEvents = 'auto';
      }
    });
  }, [setupMouseEnterListener, highlighting]);

  /**
   * Setup embedded SVG element interactions
   */
  const setupEmbeddedSvgElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, dslPath, {
      icon: '🖼️',
      label: 'EMBEDDED SVG',
      onMouseEnter: () => {
        highlighting.triggerEmbeddedSvgHighlight(dslPath);
      }
    });

    // Add custom click handler for embedded SVGs (capture phase)
    svgElem.addEventListener('click', (event: MouseEvent) => {
      onEmbeddedSVGClick(dslPath, event);
    }, { capture: true });
  }, [setupMouseEnterListener, highlighting, onEmbeddedSVGClick]);

  /**
   * Setup container type SVG element interactions
   */
  const setupContainerTypeSvgElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, dslPath, {
      icon: '🏷️',
      label: 'CONTAINER TYPE SVG',
      onMouseEnter: () => {
        highlighting.triggerContainerTypeHighlight(dslPath);
      }
    });
  }, [setupMouseEnterListener, highlighting]);

  /**
   * Setup container name text element interactions
   */
  const setupContainerNameElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, dslPath, {
      icon: '🏷️',
      label: 'CONTAINER NAME TEXT',
      onMouseEnter: () => {
        highlighting.triggerContainerNameHighlight(dslPath);
      }
    });
  }, [setupMouseEnterListener, highlighting]);

  /**
   * Setup result container element interactions
   */
  const setupResultContainerElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, dslPath, {
      icon: '📦',
      label: 'RESULT CONTAINER',
      onMouseEnter: () => {
        highlighting.triggerResultContainerHighlight(dslPath);
      }
    });
  }, [setupMouseEnterListener, highlighting]);

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
      const dslPath = getDslPath(svgElem);

      if (!dslPath) return;

      // Determine element type and setup appropriate interactions
      // Check smaller/internal elements first, then containers, to avoid event blocking
      if (isOperationElement(svgElem)) {
        setupOperationElement(svgElem, dslPath);
      } else if (isContainerNameElement(svgElem)) {
        setupContainerNameElement(svgElem, dslPath);
      } else if (isTextElement(svgElem)) {
        setupTextElement(svgElem, dslPath);
      } else if (isEmbeddedSvgElement(svgElem)) {
        setupEmbeddedSvgElement(svgElem, dslPath);
      } else if (isContainerTypeSvgElement(svgElem)) {
        setupContainerTypeSvgElement(svgElem, dslPath);
      } else if (isBoxElement(svgElem)) {
        setupBoxElement(svgElem, dslPath);
      } else if (isResultContainerElement(svgElem)) {
        setupResultContainerElement(svgElem, dslPath);
      }
    });
  }, [
    svgRef,
    setupOperationElement,
    setupResultContainerElement,
    setupBoxElement,
    setupContainerNameElement,
    setupTextElement,
    setupEmbeddedSvgElement,
    setupContainerTypeSvgElement
  ]);

  const returnValue = useMemo(() => ({
    setupSVGInteractions,
    clearHighlights,
  }), [setupSVGInteractions, clearHighlights]);

  return returnValue;
};
