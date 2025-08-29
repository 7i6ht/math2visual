import { useCallback } from 'react';
import { isTextElement, isOperationElement, isBoxElement, isEmbeddedSvgElement, isContainerTypeSvgElement, isContainerNameElement, isResultContainerElement, getDslPath, setCursorStyle } from '../utils/elementUtils';

interface UseElementInteractionsProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  highlighting: {
    clearAllHighlights: () => void;
    triggerBoxHighlight: (dslPath: string) => void;
    triggerTextHighlight: (dslPath: string) => void;
    triggerOperationHighlight: (dslPath: string) => void;
    triggerEmbeddedSvgHighlight: (dslPath: string) => void;
    triggerContainerTypeHighlight: (dslPath: string) => void;
    triggerContainerNameHighlight: (dslPath: string) => void;
    triggerResultContainerHighlight: (dslPath: string) => void;
  };
  onComponentClick?: (dslPath: string, clickPosition: { x: number; y: number }) => void;
  setHoveredComponent: (component: string | null) => void;
  setSelectedComponent: (component: string | null) => void;
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
  onComponentClick,
  setHoveredComponent,
  setSelectedComponent,
}: UseElementInteractionsProps) => {

  /**
   * Clear all highlights and reset hover state
   */
  const clearHighlights = useCallback(() => {
    setHoveredComponent(null);
    highlighting.clearAllHighlights();
  }, [setHoveredComponent, highlighting]);

  /**
   * Trigger a highlight and update hover state
   */
  const triggerHighlight = useCallback((dslPath: string, highlightFn: () => void) => {
    setHoveredComponent(dslPath);
    highlightFn();
  }, [setHoveredComponent]);

  /**
   * Setup event listeners for a specific SVG element
   */
  const setupElementListeners = useCallback((
    svgElem: SVGElement,
    dslPath: string,
    config: ElementListenerConfig
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

    setCursorStyle(svgElem, 'pointer');
    config.extraSetup?.();
  }, [clearHighlights, setSelectedComponent, onComponentClick]);

  /**
   * Setup operation element interactions
   */
  const setupOperationElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupElementListeners(svgElem, dslPath, {
      icon: '⚙️',
      label: 'OPERATION',
      onMouseEnter: () => {
        console.log(`⚙️ OPERATION MOUSEENTER: ${dslPath}`);
        triggerHighlight(dslPath, () => highlighting.triggerOperationHighlight(dslPath));
      }
    });
  }, [setupElementListeners, triggerHighlight, highlighting]);

  /**
   * Setup box element interactions
   */
  const setupBoxElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupElementListeners(svgElem, dslPath, {
      icon: '📦',
      label: 'BOX',
      onMouseEnter: () => {
        console.log(`📦 BOX MOUSEENTER: ${dslPath}`);
        triggerHighlight(dslPath, () => highlighting.triggerBoxHighlight(dslPath));
      }
    });
  }, [setupElementListeners, triggerHighlight, highlighting]);

  /**
   * Setup text element interactions
   */
  const setupTextElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    const quantityDslPath = dslPath;
    const entityDslPath = quantityDslPath.replace('/entity_quantity', '');
    
    setupElementListeners(svgElem, dslPath, {
      icon: '📝',
      label: 'TEXT',
      onMouseEnter: () => {
        console.log(`📝 TEXT MOUSEENTER: ${quantityDslPath} -> triggering for entity: ${entityDslPath}`);
        triggerHighlight(quantityDslPath, () => highlighting.triggerTextHighlight(quantityDslPath));
      },
      onClickTarget: entityDslPath,
      extraSetup: () => {
        svgElem.style.pointerEvents = 'auto';
      }
    });
  }, [setupElementListeners, triggerHighlight, highlighting]);

  /**
   * Setup embedded SVG element interactions
   */
  const setupEmbeddedSvgElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupElementListeners(svgElem, dslPath, {
      icon: '🖼️',
      label: 'EMBEDDED SVG',
      onMouseEnter: () => {
        triggerHighlight(dslPath, () => highlighting.triggerEmbeddedSvgHighlight(dslPath));
      }
    });
  }, [setupElementListeners, triggerHighlight, highlighting]);

  /**
   * Setup container type SVG element interactions
   */
  const setupContainerTypeSvgElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupElementListeners(svgElem, dslPath, {
      icon: '🏷️',
      label: 'CONTAINER TYPE SVG',
      onMouseEnter: () => {
        console.log(`🏷️ CONTAINER TYPE SVG MOUSEENTER: ${dslPath}`);
        triggerHighlight(dslPath, () => highlighting.triggerContainerTypeHighlight(dslPath));
      }
    });
  }, [setupElementListeners, triggerHighlight, highlighting]);

  /**
   * Setup container name text element interactions
   */
  const setupContainerNameElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupElementListeners(svgElem, dslPath, {
      icon: '🏷️',
      label: 'CONTAINER NAME TEXT',
      onMouseEnter: () => {
        console.log(`🏷️ CONTAINER NAME TEXT MOUSEENTER: ${dslPath}`);
        triggerHighlight(dslPath, () => highlighting.triggerContainerNameHighlight(dslPath));
      }
    });
  }, [setupElementListeners, triggerHighlight, highlighting]);

  /**
   * Setup result container element interactions
   */
  const setupResultContainerElement = useCallback((svgElem: SVGElement, dslPath: string) => {
    setupElementListeners(svgElem, dslPath, {
      icon: '📦',
      label: 'RESULT CONTAINER',
      onMouseEnter: () => {
        console.log(`📦 RESULT CONTAINER MOUSEENTER: ${dslPath}`);
        triggerHighlight(dslPath, () => highlighting.triggerResultContainerHighlight(dslPath));
      }
    });
  }, [setupElementListeners, triggerHighlight, highlighting]);

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

  return {
    setupSVGInteractions,
    clearHighlights,
  };
};
