import type { ApiRequest, ApiResponse } from "@/types";
import pkg from "../../package.json";

// Read base URL from frontend/package.json (fallback to same-origin)
const PACKAGE_PROXY = (pkg as any)?.proxy as string | undefined;
const BASE_URL = PACKAGE_PROXY && PACKAGE_PROXY.trim().replace(/\/$/, "") || window.location.origin;
const API_BASE_URL = `${BASE_URL}/api`;

export class ApiError extends Error {
  public status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiService = {
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

      if (!response.ok) {
        throw new ApiError(result.error || "Unknown error", response.status);
      }

      return result;
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

export { apiService };
export default apiService; 