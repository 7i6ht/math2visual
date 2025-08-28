import { useState, useEffect } from 'react';
import type { 
  ComponentMapping, 
  UseVisualInteractionProps, 
  UseVisualInteractionReturn 
} from '../types/visualInteraction';
import { useHighlighting } from './useHighlighting';
import { useElementInteractions } from './useElementInteractions';

/**
 * Main hook for visual interaction functionality in SVG elements
 * 
 * Provides comprehensive interaction capabilities including:
 * - Hover highlighting for boxes, text, and operations
 * - Cross-component highlighting (SVG ↔ DSL Editor ↔ MWP text)
 * - Click handling and component selection
 * - State management for interactive components
 * 
 * @param props - Configuration object with refs and event handlers
 * @returns Object containing state and control functions
 */
export const useVisualInteraction = ({
  svgRef,
  mwpValue,
  onDSLRangeHighlight,
  onMWPRangeHighlight,
  onComponentClick,
}: UseVisualInteractionProps): UseVisualInteractionReturn => {
  // ===== STATE MANAGEMENT =====
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentMappings, setComponentMappings] = useState<ComponentMapping>({});

  // ===== COMPOSED HOOKS =====
  
  // Highlighting functionality (visual, DSL, MWP highlighting)
  const highlighting = useHighlighting({
    svgRef,
    componentMappings,
    mwpValue,
    onDSLRangeHighlight,
    onMWPRangeHighlight,
  });

  // Event management and interaction setup
  const interactions = useElementInteractions({
    svgRef,
    highlighting,
    onComponentClick,
    setHoveredComponent,
    setSelectedComponent,
  });

  // ===== SETUP LOGIC =====
  
  // Setup interactions when component mappings are available
  useEffect(() => {
    if (Object.keys(componentMappings).length > 0 && svgRef.current) {
      interactions.setupSVGInteractions();
    }
  }, [componentMappings, interactions, svgRef]);

  // ===== PUBLIC API =====

  return {
    // Current state
    hoveredComponent,
    selectedComponent,
    componentMappings,
    
    // State setters
    setComponentMappings,
    setSelectedComponent,
    
    // Setup function (for manual triggering if needed)
    setupSVGInteractions: interactions.setupSVGInteractions,
  };
};
