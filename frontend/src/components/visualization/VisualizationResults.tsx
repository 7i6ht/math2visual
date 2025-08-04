import { VisualizationCard } from "./VisualizationCard";
import { SVGMissingError } from "../errors/SVGMissingError";
import { UploadService } from "@/utils/upload";
import { toast } from "sonner";
import type { SVGMissingError as SVGMissingErrorType } from "@/types";

interface VisualizationResultsProps {
  svgFormal: string | null;
  formalError: string | null;
  svgIntuitive: string | null;
  intuitiveError: string | null;
  missingSvgError: SVGMissingErrorType | null;
  vl: string | null;
  uploadLoading: boolean;
  setResults: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string | null, intuitiveError?: string | null, isSvgMissing?: boolean, missingSvgName?: string) => void;
  setUploadLoading: (loading: boolean) => void;
  clearMissingSvgError: () => void;
}

export const VisualizationResults = ({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
  missingSvgError,
  vl,
  uploadLoading,
  setResults,
  setUploadLoading,
  clearMissingSvgError,
}: VisualizationResultsProps) => {
  // Handle upload and regenerate workflow with enhanced error handling
  const handleUploadAndRegenerate = async (file: File, expectedFilename: string) => {
    const uploadToastId = `upload-${Date.now()}`;
    
    try {
      setUploadLoading(true);
      
      // Show upload progress toast
      toast.loading('Uploading SVG file...', { id: uploadToastId });
      
      // Step 1: Upload the file
      const uploadResult = await UploadService.uploadSVG(file, expectedFilename);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      toast.success('SVG file uploaded successfully', { id: uploadToastId });
      
      // Step 2: Clear the missing SVG error
      clearMissingSvgError();
      
      // Step 3: Trigger regeneration with current VL
      if (!vl) {
        toast.warning('No visual language available for regeneration');
        return;
      }

      // Show regeneration progress
      toast.loading('Regenerating visualizations...', { id: uploadToastId });

      try {
        // Import the API service to regenerate
        const { default: apiService } = await import('@/services/api');
        const result = await apiService.generateFromDSL(vl);
        
        setResults(
          result.visual_language,
          result.svg_formal,
          result.svg_intuitive,
          result.formal_error,
          result.intuitive_error,
          result.is_svg_missing,
          result.missing_svg_name
        );
        
        // Check if regeneration was successful
        if (result.svg_formal || result.svg_intuitive) {
          toast.success('Visualizations regenerated successfully', { id: uploadToastId });
        } else if (result.is_svg_missing) {
          toast.warning('Another SVG file is still missing', { 
            id: uploadToastId,
            description: `Missing: ${result.missing_svg_name}` 
          });
        } else {
          toast.error('Regeneration failed', { 
            id: uploadToastId,
            description: 'Unable to generate visualizations' 
          });
        }
        
      } catch (regenerationError) {
        console.error('Regeneration failed:', regenerationError);
        toast.error('Regeneration failed', { 
          id: uploadToastId,
          description: regenerationError instanceof Error ? regenerationError.message : 'Failed to regenerate visualizations'
        });
      }
      
    } catch (uploadError) {
      console.error('Upload failed:', uploadError);
      
      // Provide specific error messages based on error type
      let errorTitle = 'Upload failed';
      let errorDescription = uploadError instanceof Error ? uploadError.message : 'An unexpected error occurred';
      
      if (uploadError instanceof Error) {
        if (uploadError.message.includes('Network error')) {
          errorTitle = 'Connection error';
        } else if (uploadError.message.includes('timed out')) {
          errorTitle = 'Upload timeout';
        } else if (uploadError.message.includes('too large')) {
          errorTitle = 'File too large';
        } else if (uploadError.message.includes('malicious')) {
          errorTitle = 'Security check failed';
        }
      }
      
      toast.error(errorTitle, { 
        id: uploadToastId,
        description: errorDescription 
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // Only show the results container if there's something to display
  if (!svgFormal && !formalError && !svgIntuitive && !intuitiveError && !missingSvgError) {
    return null;
  }

  // Show missing SVG error component if we have a missing SVG error
  if (missingSvgError) {
    return (
      <SVGMissingError
        missingSvgError={missingSvgError}
        onUploadAndRegenerate={handleUploadAndRegenerate}
        uploadLoading={uploadLoading}
      />
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6 text-center">Generated Visualizations</h2>
      
      <div className="svg-row">
        <VisualizationCard
          svgContent={svgFormal}
          error={formalError}
          title="Formal Representation"
          type="formal"
        />
        
        <VisualizationCard
          svgContent={svgIntuitive}
          error={intuitiveError}
          title="Intuitive Representation"
          type="intuitive"
        />
      </div>
    </div>
  );
}; 