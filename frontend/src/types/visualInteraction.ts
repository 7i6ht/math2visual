/**
 * Mapping between DSL paths and their corresponding metadata
 * Contains range information for highlighting and property values for processing
 */
export interface ComponentMapping {
  [dslPath: string]: {
    /** Character range in the DSL text for highlighting */
    dsl_range: [number, number];
    /** Property value (quantity, name, etc.) if this path represents a property */
    property_value?: string;
  };
}

/**
 * Props for the main useVisualInteraction hook
 * Provides all necessary dependencies and callback handlers
 */
export interface UseVisualInteractionProps {
  /** Reference to the SVG container element */
  svgRef: React.RefObject<HTMLDivElement | null>;
  /** Math Word Problem text for cross-highlighting */
  mwpValue: string;
  /** Component mappings for DSL path to property value mapping */
  componentMappings: ComponentMapping;
  /** Callback for highlighting ranges in the DSL editor */
  onDSLRangeHighlight?: (ranges: Array<[number, number]>) => void;
  /** Callback for highlighting ranges in the MWP text */
  onMWPRangeHighlight?: (ranges: Array<[number, number]>) => void;
  /** Current DSL path from cursor position in editor */
  currentDSLPath?: string | null;
  /** Callback for embedded SVG clicks */
  onEmbeddedSVGClick: (dslPath: string, event: MouseEvent) => void;
  /** Whether the SVG selector popup is currently open */
  isSelectorOpen?: boolean;
}

/**
 * Configuration for highlight behavior
 * Used internally by highlighting hooks
 */
export interface HighlightConfig {
  /** Function to apply visual highlighting to SVG elements */
  applyVisualHighlight: (mapping: any) => void;
  /** Function to apply highlighting to MWP text */
  applyMWPHighlight: (mapping: any) => void;
}

/**
 * Configuration for element event listeners
 * Used internally by interaction hooks
 */
export interface ElementListenerConfig {
  /** Mouse enter event handler */
  onMouseEnter: () => void;
  /** Additional setup logic for the element */
  extraSetup?: () => void;
}
