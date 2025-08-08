// Form data types
export interface FormData {
  mwp: string;
  formula?: string;
}

export interface VLFormData {
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
  missing_svg_entities?: string[];
}

// Application state types
// Upload functionality types
export interface SVGUploadResponse {
  success: boolean;
  error?: string;
  message?: string;
  file_hash?: string;
}

export interface PageState {
  vl: string | null;
  mpFormLoading: boolean;
  vlFormLoading: boolean;
  svgFormal: string | null;
  svgIntuitive: string | null;
  formalError: string | null;
  intuitiveError: string | null;
  currentAbortFunction: (() => void) | undefined;
  missingSVGEntities: string[];
  uploadGenerating: boolean;
  uploadedEntities: string[];
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

 