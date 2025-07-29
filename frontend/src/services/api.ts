import type { ApiRequest, ApiResponse } from "@/types";

const API_BASE_URL = "http://localhost:5001/api";

export class ApiError extends Error {
  public status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const apiService = {
  async generateVisualization(request: ApiRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(request)
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new ApiError(result.error || "Unknown error", response.status);
      }

      return result;
    } catch (error) {
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

  async generateFromMathProblem(mwp: string, formula?: string): Promise<ApiResponse> {
    return this.generateVisualization({ mwp, formula });
  },

  async generateFromDSL(dsl: string): Promise<ApiResponse> {
    return this.generateVisualization({ dsl });
  }
}; 