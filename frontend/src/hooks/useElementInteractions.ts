import { useCallback, useMemo } from 'react';
import { isTextElement, isOperationElement, isBoxElement, isEmbeddedSvgElement, isContainerTypeSvgElement, isContainerNameElement, isResultContainerElement, getDslPath, setCursorStyle } from '../utils/elementUtils';

interface UseElementInteractionsProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  highlighting: {
    clearHighlightForElement: (element: SVGElement, className: 'highlighted-box' | 'highlighted-text' | 'highlighted-svg') => void;
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
  isDisabled?: boolean;
}

interface ElementListenerConfig {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
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
  isDisabled = false,
}: UseElementInteractionsProps) => {
  /**
   * Setup mouseenter and related listeners for a specific SVG element
   */
  const setupMouseEnterListener = useCallback((
    svgElem: SVGElement,
    config: ElementListenerConfig,
  ) => {
    // Remove existing listeners
    svgElem.onmouseenter = null;
    svgElem.onmouseleave = null;
    svgElem.onclick = null;

    // If selector is open or disabled, don't set up hover listeners
    if (isSelectorOpen || isDisabled) {
      return;
    }

    // Add event listeners
    svgElem.onmouseenter = config.onMouseEnter;
    svgElem.onmouseleave = config.onMouseLeave;
    setCursorStyle(svgElem, 'pointer');
    config.extraSetup?.();
  }, [isSelectorOpen, isDisabled]);

  /**
   * Setup operation element interactions
   */
  const setupOperationElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupMouseEnterListener(svgElem, {
      onMouseEnter: () => {
        highlighting.triggerOperationHighlight(dslPath);
      },
      onMouseLeave: () => {
        highlighting.clearHighlightForElement(svgElem, 'highlighted-svg');
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
      },
      onMouseLeave: () => {
        highlighting.clearHighlightForElement(svgElem, 'highlighted-box');
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
      onMouseLeave: () => {
        highlighting.clearHighlightForElement(svgElem, 'highlighted-text');
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
      },
      onMouseLeave: () => {
        highlighting.clearHighlightForElement(svgElem, 'highlighted-svg');
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
      },
      onMouseLeave: () => {
        highlighting.clearHighlightForElement(svgElem, 'highlighted-svg');
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
      },
      onMouseLeave: () => {
        highlighting.clearHighlightForElement(svgElem, 'highlighted-text');
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
      },
      onMouseLeave: () => {
        highlighting.clearHighlightForElement(svgElem, 'highlighted-box');
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

      // If disabled, clear all listeners and return
      if (isDisabled) {
        svgElem.onmouseenter = null;
        svgElem.onmouseleave = null;
        svgElem.onclick = null;
        svgElem.style.cursor = 'default';
        return;
      }

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
    isDisabled,
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
  }), [setupSVGInteractions]);

  return returnValue;
};
