import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SVGDatasetService } from '@/api_services/svgDataset';
import { BasePopup } from './BasePopup.tsx';
import { trackPopupSubmit, isAnalyticsEnabled } from '@/services/analyticsTracker';

interface SVGGeneratePopupProps {
  onClose: () => void;
  onGenerate: (filename: string) => Promise<void>;
  entityName: string;
}

export const SVGGeneratePopup: React.FC<SVGGeneratePopupProps> = ({
  onClose,
  onGenerate,
  entityName,
}) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [generatedSVG, setGeneratedSVG] = useState<string | null>(null);
  const [tempFilename, setTempFilename] = useState<string | null>(null);
  const analyticsEnabled = isAnalyticsEnabled();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate SVG on mount
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const generateSVG = async () => {
      try {
        const result = await SVGDatasetService.generateSVG(entityName, controller.signal);
        
        if (!result.success || !result.svg_content || !result.temp_filename) {
          throw new Error(result.error || 'Generation failed');
        }

        setGeneratedSVG(result.svg_content);
        setTempFilename(result.temp_filename);
        setIsGenerating(false);
      } catch (err) {
        // Don't show error if request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('SVG generation failed:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate SVG';
        toast.error(errorMsg);
        onClose();
      }
    };

    generateSVG();
  }, [entityName, onClose]);

  // Handle confirmation (double-click or Enter)
  const handleConfirm = async () => {
    if (!tempFilename || isGenerating) return;

    try {
      if (analyticsEnabled) {
        trackPopupSubmit('svg_generate', tempFilename);
      }

      // Move temp file to dataset
      const result = await SVGDatasetService.confirmGeneratedSVG(tempFilename);
      
      if (!result.success || !result.filename) {
        throw new Error(result.error || 'Failed to confirm SVG');
      }

      // Extract the name without extension
      const svgName = result.filename.replace(/\.svg$/i, '');
      
      // Trigger visual regeneration
      await onGenerate(svgName);
      onClose();
    } catch (err) {
      console.error('Failed to confirm generated SVG:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to confirm SVG');
    }
  };

  // Handle cancellation (click outside)
  const handleCancel = async () => {
    // Abort ongoing generation
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort('SVG generation cancelled by user');
    }

    // Delete temporary file if it exists
    if (tempFilename) {
      try {
        await SVGDatasetService.deleteTemporarySVG(tempFilename);
      } catch (err) {
        console.error('Failed to delete temporary SVG:', err);
      }
    }
    onClose();
  };

  // Handle keyboard events
  const handlePopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && generatedSVG && !isGenerating) {
      event.preventDefault();
      if (analyticsEnabled) {
        trackPopupSubmit('svg_generate', tempFilename || '', 'keyboard');
      }
      handleConfirm();
    }
  };

  return (
    <BasePopup 
      onClose={handleCancel} 
      onKeyDown={handlePopupKeyDown}
      className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center overflow-hidden"
    >
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-gray-600 text-center">
            Generating {entityName} icon...
          </p>
        </div>
      ) : generatedSVG ? (
        <div 
          ref={containerRef}
          className="w-full h-full cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-4"
          onDoubleClick={handleConfirm}
        >
          <div 
            className="svg-preview-container w-full h-[calc(100%-2rem)] flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: generatedSVG }}
          />
          <p className="text-xs text-gray-500 text-center h-8 flex items-center justify-center">
            Double-click or press Enter to confirm
          </p>
        </div>
      ) : null}
    </BasePopup>
  );
};

