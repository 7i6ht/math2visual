import type { ApiRequest, ApiResponse } from "@/types";
import type { ParsedOperation } from "@/utils/dsl-parser";
import { BACKEND_API_URL as API_BASE_URL } from "@/config/api";
import { DSLFormatter } from "@/utils/dsl-formatter";
import { parseWithErrorHandling } from "@/utils/dsl-parser";

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
      // Ensure DSL sent to backend is compact to reduce payload and parsing ambiguity
      const requestBody: ApiRequest = request.dsl
        ? { ...request, dsl: DSLFormatter.minify(request.dsl) }
        : request;

      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal
      });

      const result: ApiResponse = await response.json();

      // Special handling for Visual Language parse errors - return them as successful responses
      // so they can be displayed in the VisualizationResults tabs
      if (!response.ok && result.error && /Visual Language parse error/i.test(result.error)) {
        return {
          visual_language: request.dsl || "", // Preserve the original DSL input
          svg_formal: null,
          svg_intuitive: null,
          formal_error: result.error,
          intuitive_error: undefined,
          missing_svg_entities: [],
          parsedDSL: { operation: 'unknown', entities: [] } // Empty but valid ParsedOperation for parse error case
        } as ApiResponse & { parsedDSL: ParsedOperation };
      }

      if (!response.ok) {
        throw new ApiError(result.error || "Unknown error", response.status);
      }

      // Frontend service: ensure DSL is formatted and component mappings are computed
      const formatter = new DSLFormatter();
      const parsed = parseWithErrorHandling(result.visual_language || '');
      if (!parsed) {
        // Return original DSL with empty mappings on parse error
        return {
          ...result,
          componentMappings: {}
        } as ApiResponse;
      }

      const formattedDSL = formatter.formatWithRanges(parsed);
      return {
        ...result,
        visual_language: formattedDSL,
        componentMappings: { ...formatter.componentRegistry },
        parsedDSL: parsed
      } as ApiResponse & { parsedDSL: ParsedOperation };
    } catch (error) {
      // Handle abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
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

  async generateFromMathProblem(mwp: string, formula?: string, hint?: string, abortSignal?: AbortSignal): Promise<ApiResponse> {
    return this.generateVisualization({ mwp, formula, hint }, abortSignal);
  },

  async generateFromDSL(dsl: string, abortSignal?: AbortSignal): Promise<ApiResponse> {
    return this.generateVisualization({ dsl }, abortSignal);
  },

};

export { generationService as generationService };
export default generationService; 