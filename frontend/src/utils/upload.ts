import type { SVGUploadResponse, ValidationDetails } from "@/types";
import { ValidationError } from "@/types";
import { BACKEND_BASE_URL as API_BASE_URL } from "@/config/api";

export class UploadService {
  /**
   * Generate detailed error message from validation details
   */
  static generateDetailedErrorMessage(validationDetails: ValidationDetails, genericError?: string): { title: string; description: string } {
    const issues: string[] = [];
    
    if (!validationDetails.filename_valid) {
      issues.push("Invalid filename format");
    }
    
    if (!validationDetails.size_valid) {
      issues.push("File size exceeds maximum limit (5MB)");
    }
    
    if (!validationDetails.type_valid) {
      issues.push("File is not a valid SVG format");
    }
    
    if (!validationDetails.content_valid) {
      issues.push("SVG content is invalid or corrupted");
    }
    
    // Handle antivirus scan results
    if (validationDetails.antivirus_scan) {
      const scanResult = validationDetails.antivirus_scan.toLowerCase();
      if (scanResult.includes('malware') || scanResult.includes('virus') || scanResult.includes('threat')) {
        issues.push("File contains potentially malicious content");
      } else if (scanResult.includes('error') || scanResult.includes('failed')) {
        issues.push("Security scan could not be completed");
      }
    }
    
    if (issues.length === 0) {
      // If no specific issues found but we have validation details, it means all checks passed
      // but there might be another issue, so use the generic error
      return {
        title: "Upload failed",
        description: genericError || "An unexpected error occurred during upload"
      };
    }
    
    // Determine the most appropriate title based on the issues
    let title = "Upload failed";
    if (issues.some(issue => issue.includes("malicious"))) {
      title = "Security check failed";
    } else if (issues.some(issue => issue.includes("size"))) {
      title = "File too large";
    } else if (issues.some(issue => issue.includes("format") || issue.includes("invalid") || issue.includes("corrupted"))) {
      title = "Invalid file";
    }
    
    const description = issues.length === 1 
      ? issues[0]
      : `Multiple issues found:\n• ${issues.join('\n• ')}`;
    
    return { title, description };
  }

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
    } catch (error) {
      // Enhanced error categorization for non-validation errors
      if (error instanceof Error) {
        
        // Provide more user-friendly error messages for generic errors
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
         // Create enhanced error with validation details if available
         if (result.validation_details) {
           const { title, description } = this.generateDetailedErrorMessage(
             result.validation_details, 
             result.error
           );
           throw new ValidationError(description, title, result.validation_details);
         }
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