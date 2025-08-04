import type { SVGUploadResponse } from "@/types";

const API_BASE_URL = "http://localhost:5001";

export class UploadService {
  /**
   * Upload SVG file to the backend with enhanced error handling
   */
  static async uploadSVG(file: File, expectedFilename: string): Promise<SVGUploadResponse> {
    try {
      // Pre-validate on client side
      const validation = this.validateFile(file, expectedFilename);
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
        if (error.message.includes('Filename mismatch')) {
          throw new Error(`File name doesn't match requirement. Please rename your file to: ${expectedFilename}`);
        }
        if (error.message.includes('File too large')) {
          throw new Error('File is too large. Maximum size is 5MB.');
        }
        if (error.message.includes('Invalid SVG content')) {
          throw new Error('File appears to be corrupted or is not a valid SVG file.');
        }
        if (error.message.includes('malicious content')) {
          throw new Error('File contains potentially unsafe content and cannot be uploaded.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File, expectedFilename: string): { valid: boolean; error?: string } {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.svg')) {
      return { valid: false, error: 'File must be an SVG' };
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, error: 'File too large (maximum 5MB)' };
    }

    // Check filename matches expected
    if (file.name !== expectedFilename) {
      return { 
        valid: false, 
        error: `Filename mismatch. Expected: ${expectedFilename}, Got: ${file.name}` 
      };
    }

    // Basic content validation (check if it looks like SVG)
    return { valid: true };
  }
}