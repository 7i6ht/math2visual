import { useState, useCallback, useEffect, useRef } from 'react';
import type { ComponentMapping, UseVisualInteractionProps } from '../types/visualInteraction';
import { isTextElement, isOperationElement, isBoxElement, getDslPath, setCursorStyle } from '../utils/elementUtils';
import { useHighlighting } from './useHighlighting';

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

  // Use highlighting hook for all highlighting functionality
  const highlighting = useHighlighting({
    svgRef,
    componentMappings,
    mwpValue,
    onDSLRangeHighlight,
    onMWPRangeHighlight,
  });

  const setupSVGInteractions = useCallback(() => {
    // Prevent infinite loops with ref
    if (setupInProgressRef.current || !svgRef.current) {
      return;
    }

    setupInProgressRef.current = true;

    try {

      // State management for hover component
      const triggerHighlight = (dslPath: string, highlightFn: () => void) => {
        setHoveredComponent(dslPath);
        highlightFn();
      };

      // Helper function to clear all highlights
      const clearHighlights = () => {
        setHoveredComponent(null);
        highlighting.clearAllHighlights();
      };

      // Helper function to setup event listeners for elements
      const setupElementListeners = (
        svgElem: SVGElement,
        dslPath: string,
        config: {
          icon: string;
          label: string;
          onMouseEnter: () => void;
          onClickTarget?: string;
          extraSetup?: () => void;
        }
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
      };

      // Set up interactions on all elements with DSL paths (both boxes and text)
      const allInteractiveElements = svgRef.current?.querySelectorAll('[data-dsl-path]');
      allInteractiveElements?.forEach((element) => {
        const svgElem = element as SVGElement;
        const dslPath = getDslPath(svgElem);

        if (!dslPath) return;

        const textEl = isTextElement(svgElem);
        const opEl = isOperationElement(svgElem);
        const boxEl = isBoxElement(svgElem);

        if (opEl) {
          setupElementListeners(svgElem, dslPath, {
            icon: '⚙️',
            label: 'OPERATION',
            onMouseEnter: () => {
              console.log(`⚙️ OPERATION MOUSEENTER: ${dslPath}`);
              triggerHighlight(dslPath, () => highlighting.triggerOperationHighlight(dslPath));
            }
          });

        } else if (boxEl) {
          setupElementListeners(svgElem, dslPath, {
            icon: '📦',
            label: 'BOX',
            onMouseEnter: () => {
              console.log(`📦 BOX MOUSEENTER: ${dslPath}`);
              triggerHighlight(dslPath, () => highlighting.triggerBoxHighlight(dslPath));
            }
          });

        } else if (textEl) {
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
        }
      });

    } finally {
      // Always reset the flag, even if there's an error
      setupInProgressRef.current = false;
    }
  }, [svgRef, componentMappings, onDSLRangeHighlight, onMWPRangeHighlight, onComponentClick, mwpValue, highlighting]);

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
