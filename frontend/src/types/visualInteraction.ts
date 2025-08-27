export interface ComponentMapping {
  [dslPath: string]: {
    dsl_range: [number, number];
    property_value?: string; // Only set if this dsl path represents a property
  };
}

export interface UseVisualInteractionProps {
  svgRef: React.RefObject<HTMLDivElement | null>;
  mwpValue: string;
  onDSLRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onMWPRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onComponentClick?: (dslPath: string, clickPosition: { x: number; y: number }) => void;
}

export interface HighlightConfig {
  icon: string;
  label: string;
  applyVisualHighlight: (mapping: any) => void;
  applyMWPHighlight: (mapping: any) => void;
}

export interface ElementListenerConfig {
  icon: string;
  label: string;
  onMouseEnter: () => void;
  onClickTarget?: string;
  extraSetup?: () => void;
}
