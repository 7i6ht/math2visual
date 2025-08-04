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
export interface PageState {
  vl: string | null;
  mainFormLoading: boolean;
  resubmitLoading: boolean;
  svgFormal: string | null;
  svgIntuitive: string | null;
  formalError: string | null;
  intuitiveError: string | null;
  currentAbortFunction: (() => void) | undefined;
}

// Download types
export type DownloadFormat = 'svg' | 'png' | 'pdf';
export type VisualizationType = 'formal' | 'intuitive';

export interface DownloadOption {
  format: DownloadFormat;
  label: string;
  icon: string;
}

// Component props types
export interface VisualizationCardProps {
  svgContent?: string | null;
  error?: string | null;
  title: string;
  type: VisualizationType;
}

export interface ErrorDisplayProps {
  error: string;
}

 