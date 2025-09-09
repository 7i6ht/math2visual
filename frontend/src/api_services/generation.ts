import type { ApiRequest, ApiResponse } from "@/types";
import { BACKEND_API_URL as API_BASE_URL } from "@/config/api";
import { DSLFormatter } from "@/utils/dsl-formatter";

export class ApiError extends Error {
  public status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const generationService = {
  async generateVisualization(request: ApiRequest, abortSignal?: AbortSignal): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(request),
        signal: abortSignal
      });

      const result: ApiResponse = await response.json();

      // Special handling for DSL parse errors - return them as successful responses
      // so they can be displayed in the VisualizationResults accordion
      if (!response.ok && result.error && /DSL parse error/i.test(result.error)) {
        return {
          visual_language: request.dsl || "", // Preserve the original DSL input
          svg_formal: null,
          svg_intuitive: null,
          formal_error: result.error,
          intuitive_error: undefined,
          missing_svg_entities: []
        };
      }

      if (!response.ok) {
        throw new ApiError(result.error || "Unknown error", response.status);
      }

      // Frontend service: ensure DSL is formatted and component mappings are computed
      const formatter = new DSLFormatter();
      const { formattedDSL, componentMappings } = formatter.processAndFormatDSL(result.visual_language || '');
      return {
        ...result,
        visual_language: formattedDSL,
        componentMappings
      } as ApiResponse;
    } catch (error) {
      // Handle abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError("Request was cancelled");
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle network errors, JSON parsing errors, etc.
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError("Network error: Could not connect to server");
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    }
  },

  async generateFromMathProblem(mwp: string, formula?: string, abortSignal?: AbortSignal): Promise<ApiResponse> {
    return this.generateVisualization({ mwp, formula }, abortSignal);
  },

  async generateFromDSL(dsl: string, abortSignal?: AbortSignal): Promise<ApiResponse> {
    return this.generateVisualization({ dsl }, abortSignal);
  }
};

export { generationService as generationService };
export default generationService; 