// Form data types
export interface FormData {
  mwp: string;
  formula?: string;
}

export interface ResubmitData {
  dsl: string;
}

// API request and response types
export interface ApiRequest {
  mwp?: string;
  formula?: string;
  dsl?: string;
}

export interface ApiResponse {
  visual_language: string;
  svg_formal: string | null;
  svg_intuitive: string | null;
  formal_error?: string;
  intuitive_error?: string;
  error?: string;
}

// Application state types
export interface VisualizationState {
  vl: string | null;
  error: string | null;
  loading: boolean;
  svgFormal: string | null;
  svgIntuitive: string | null;
  formalError: string | null;
  intuitiveError: string | null;
}

// Component props types
export interface VisualizationCardProps {
  svgContent?: string | null;
  error?: string | null;
  title: string;
  filename: string;
}

export interface ErrorDisplayProps {
  error: string;
}

export interface LoadingSpinnerProps {
  message?: string;
} 