import type { SVGUploadResponse } from "@/types";
import pkg from "../../package.json";

// Read base URL from frontend/package.json (fallback to same-origin)
const PACKAGE_PROXY = (pkg as any)?.proxy as string | undefined;
const BASE_URL = PACKAGE_PROXY && PACKAGE_PROXY.trim().replace(/\/$/, "") || window.location.origin;
const API_BASE_URL = BASE_URL;

export class UploadService {
  /**
   * Upload SVG file to the backend with enhanced error handling
   */
  static async uploadSVG(file: File, expectedFilename: string): Promise<SVGUploadResponse> {
    try {
      // Pre-validate on client side
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('expected_filename', expectedFilename);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch(`${API_BASE_URL}/api/upload-svg`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle different HTTP status codes
        if (response.status === 413) {
          throw new Error('File too large for upload');
        }

        const result = await response.json().catch(() => ({ 
          success: false, 
          error: 'Invalid server response' 
        }));

        if (!response.ok) {
          throw new Error(result.error || `Upload failed with status ${response.status}`);
        }

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        return result;

      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          throw new Error('Upload timed out. Please try again.');
        }
        
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        
        throw fetchError;
      }

    } catch (error) {
      // Enhanced error categorization
      if (error instanceof Error) {
        // Provide more user-friendly error messages
        if (error.message.includes('File too large')) {
          throw new Error('File is too large. Maximum size is 5MB.');
        }
        if (error.message.includes('Invalid SVG content')) {
          throw new Error('File appears to be corrupted or is not a valid SVG file.');
        }
        if (error.message.includes('Malicious content')) {
          throw new Error('File contains potentially unsafe content and cannot be uploaded.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, error: 'File too large (maximum 5MB)' };
    }

    // Basic content validation (check if it looks like SVG)
    return { valid: true };
  }
}