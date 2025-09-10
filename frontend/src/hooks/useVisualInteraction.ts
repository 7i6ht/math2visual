import { useState, useEffect, useRef } from 'react';
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
  currentDSLPath,
}: UseVisualInteractionProps): UseVisualInteractionReturn => {
  // ===== STATE MANAGEMENT =====
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
    currentDSLPath,
  });

  // Event management and interaction setup
  const interactions = useElementInteractions({
    svgRef,
    highlighting,
    onComponentClick,
    setSelectedComponent,
  });

  // ===== SETUP LOGIC =====
  
  // Setup interactions when component mappings are available
  useEffect(() => {
    if (Object.keys(componentMappings).length > 0 && svgRef.current) {
      interactions.setupSVGInteractions();
      // Setup transform origins for interactive elements to ensure proper scaling
      highlighting.setupTransformOrigins();
    }
  }, [componentMappings, interactions, svgRef, highlighting]);

  // Smart guard: Only trigger highlighting when currentDSLPath actually changes
  // This prevents infinite loops by tracking the previous path
  const previousPathRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (currentDSLPath && 
        currentDSLPath !== previousPathRef.current && 
        Object.keys(componentMappings).length > 0) {
      console.log('🔄 Path changed from', previousPathRef.current, 'to', currentDSLPath);
      previousPathRef.current = currentDSLPath;
      highlighting.highlightCurrentDSLPath();
    }
  }, [currentDSLPath, componentMappings, highlighting]);

  // ===== PUBLIC API =====

  return {
    // Current state
    selectedComponent,
    componentMappings,
    
    // State setters
    setComponentMappings,
    setSelectedComponent,
    
    // Setup function (for manual triggering if needed)
    setupSVGInteractions: interactions.setupSVGInteractions,
  };
};
