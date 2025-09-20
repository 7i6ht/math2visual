import { BACKEND_BASE_URL as API_BASE_URL } from '@/config/api';

export interface SVGFile {
  filename: string;
  name: string;
}

export interface SVGSearchResponse {
  files: SVGFile[];
  query?: string;
}

export class SVGDatasetService {
  /**
   * Search SVG files in the dataset
   */
  static async searchSVGFiles(query: string, limit: number = 20): Promise<SVGSearchResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/svg-dataset/search?query=${encodeURIComponent(query)}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('SVG search error:', error);
      throw new Error('Failed to search SVG files');
    }
  }

  /**
   * Check if an SVG name already exists in the dataset
   */
  static async checkSVGNameExists(name: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/svg-dataset/check-exists?name=${encodeURIComponent(name)}`
      );

      if (!response.ok) {
        throw new Error(`Check failed with status ${response.status}`);
      }

      const result = await response.json();
      return result.exists;
    } catch (error) {
      console.error('SVG name check error:', error);
      throw new Error('Failed to check SVG name');
    }
  }

  /**
   * Upload SVG file to the dataset
   */
  static async uploadSVG(file: File, expectedFilename: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    validation_details?: any;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('expected_filename', expectedFilename);

      const response = await fetch(`${API_BASE_URL}/api/svg-dataset/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Upload failed with status ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('SVG upload error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to upload SVG file'
      );
    }
  }



}
