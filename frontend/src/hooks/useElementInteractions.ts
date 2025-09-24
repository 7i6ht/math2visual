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
  onEntityQuantityClick: (dslPath: string, event: MouseEvent) => void;
  onContainerNameClick: (dslPath: string, event: MouseEvent) => void;
  isSelectorOpen?: boolean;
}

interface ElementListenerConfig {
  onMouseEnter: () => void;
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
  onEntityQuantityClick,
  onContainerNameClick,
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
    setupMouseEnterListener(svgElem, {
      onMouseEnter: () => {
        highlighting.triggerOperationHighlight(dslPath);
      }
    });
  }, [setupMouseEnterListener, highlighting]);

  /**
   * Setup box element interactions
   */
  const setupBoxElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, {
      onMouseEnter: () => {
        highlighting.triggerBoxHighlight(dslPath);
      }
    });

    // Also allow clicking on a box to trigger the entity quantity click handler
    svgElem.addEventListener('click', (event: MouseEvent) => {
      onEntityQuantityClick(dslPath, event);
    }, { capture: true });
  }, [setupMouseEnterListener, highlighting, onEntityQuantityClick]);

  /**
   * Setup text element interactions
   */
  const setupTextElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    const quantityDslPath = dslPath;

    setupMouseEnterListener(svgElem, {
      onMouseEnter: () => {
        highlighting.triggerEntityQuantityHighlight(quantityDslPath);
      },
      extraSetup: () => {
        svgElem.style.pointerEvents = 'auto';
      }
    });

    // Add click handler for entity quantity editing if path ends with entity_quantity
    if (dslPath.endsWith('/entity_quantity')) {
      svgElem.addEventListener('click', (event: MouseEvent) => {
        onEntityQuantityClick(dslPath, event);
      }, { capture: true });
    }
  }, [setupMouseEnterListener, highlighting, onEntityQuantityClick]);

  /**
   * Setup embedded SVG element interactions
   */
  const setupEmbeddedSvgElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, {
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
    setupMouseEnterListener(svgElem, {
      onMouseEnter: () => {
        highlighting.triggerContainerTypeHighlight(dslPath);
      }
    });

    // Add custom click handler for container type SVGs (capture phase)
    svgElem.addEventListener('click', (event: MouseEvent) => {
      onEmbeddedSVGClick(dslPath, event);
    }, { capture: true });
  }, [setupMouseEnterListener, highlighting, onEmbeddedSVGClick]);

  /**
   * Setup container name text element interactions
   */
  const setupContainerNameElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, {
      onMouseEnter: () => {
        highlighting.triggerContainerNameHighlight(dslPath);
      }
    });

    // Add click handler for container name editing
    svgElem.addEventListener('click', (event: MouseEvent) => {
      onContainerNameClick(dslPath, event);
    }, { capture: true });
  }, [setupMouseEnterListener, highlighting, onContainerNameClick]);

  /**
   * Setup result container element interactions
   */
  const setupResultContainerElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, {
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
