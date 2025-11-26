import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, ArrowRight, AlertCircle, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateFormatAsync } from '@/utils/validation';
import { SVGDatasetService } from '@/api_services/svgDataset';
import { BasePopup } from './BasePopup.tsx';
import { trackSVGUploadPopupType, trackPopupSubmit, trackPopupCancel, trackElementClick, isAnalyticsEnabled } from '@/services/analyticsTracker';

interface SVGUploadPopupProps {
  onClose: () => void;
  onUpload: (filename: string) => Promise<void>;
}

export const SVGUploadPopup: React.FC<SVGUploadPopupProps> = ({
  onClose,
  onUpload,
}) => {
  const [filename, setFilename] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filenameInputRef = useRef<HTMLInputElement>(null);
  const analyticsEnabled = isAnalyticsEnabled();

  // Handle cancel (click outside)
  const handleCancel = useCallback(() => {
    if (analyticsEnabled) {
      trackPopupCancel('svg_upload', 'click_outside');
    }
    onClose();
  }, [analyticsEnabled, onClose]);

  // Real-time validation for filename
  useEffect(() => {
    const validateName = async () => {
      if (filename.trim()) {
        const validation = await validateFormatAsync(filename.trim());
        setValidationError(validation.valid ? null : validation.error || null);
      } else {
        setValidationError(null);
      }
    };

    const timeoutId = setTimeout(validateName, 500);
    return () => clearTimeout(timeoutId);
  }, [filename]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto-fill name if not already set
      if (!filename.trim()) {
        const nameWithoutExt = file.name.replace(/\.svg$/i, '');
        setFilename(nameWithoutExt);
      }
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!uploadFile || !filename.trim()) {
      setError('Please select a file and enter a name');
      return;
    }

    // Frontend validation for the file name
    const validation = await validateFormatAsync(filename.trim());
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await SVGDatasetService.uploadSVG(uploadFile, `${filename.trim()}.svg`);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Trigger callback with the uploaded filename
      await onUpload(filename.trim());
      onClose();
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle keyboard events for popup
  const handlePopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && isValidSelection && !isUploading) {
      event.preventDefault();
      if (analyticsEnabled) {
        trackPopupSubmit('svg_upload', filename.trim(), 'keyboard');
      }
      handleUpload();
    }
  };

  // Auto-focus filename input when popup opens and reset state when popup closes
  useEffect(() => {
    filenameInputRef.current?.focus();
    
    // Cleanup on unmount
    const inputEl = fileInputRef.current;
    return () => {
      setFilename('');
      setUploadFile(null);
      setIsUploading(false);
      setValidationError(null);
      setError(null);
      if (inputEl) {
        inputEl.value = '';
      }
    };
  }, []);

  const isValidSelection = uploadFile && filename.trim() && !validationError;

  return (
    <BasePopup onClose={handleCancel} onKeyDown={handlePopupKeyDown} className="popup-upload-width max-h-[90vh]">
      {/* Upload Form */}
      <div className="flex gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
        <div className="relative flex-1">
          <button
            onClick={() => {
              if (analyticsEnabled) {
                trackElementClick('svg_upload_file_select_click');
              }
              fileInputRef.current?.click();
            }}
            className="absolute left-1.5 sm:left-2 md:left-2 lg:left-2.5 xl:left-3 2xl:left-3.5 3xl:left-4 4xl:left-4.5 5xl:left-3.5 6xl:left-4 7xl:left-4.5 top-1/2 transform -translate-y-1/2 responsive-smaller-icon-font-size text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-200 flex items-center justify-center p-1.5 sm:p-2"
            title="Choose SVG file"
            disabled={isUploading}
          >
            <Upload className="responsive-smaller-icon-font-size" />
          </button>
          <Input
            ref={filenameInputRef}
            value={filename}
            onChange={(e) => {
              setFilename(e.target.value);
              if (analyticsEnabled) {
                trackSVGUploadPopupType(e.target.value);
              }
            }}
            placeholder="Enter name"
            spellCheck={false}
            className="!pl-10 sm:!pl-12 md:!pl-13 lg:!pl-14 xl:!pl-15 2xl:!pl-17 3xl:!pl-18 4xl:!pl-19 5xl:!pl-24 6xl:!pl-28 7xl:!pl-30 !pr-1 rounded-r-none border-r-0 popup-button-responsive-height responsive-text-font-size focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation"
            disabled={isUploading}
          />
        </div>
        <div className="flex items-center">
          {uploadFile && (
            <button
              className="popup-button-responsive-height w-9 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center touch-manipulation"
              title={`View ${uploadFile.name} in new tab`}
              onClick={() => {
                if (analyticsEnabled) {
                  trackElementClick(`svg_upload_preview_click`, uploadFile.name);
                }
                const url = URL.createObjectURL(uploadFile);
                window.open(url, '_blank');
                // Clean up the object URL after a short delay
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
              disabled={isUploading}
            >
              <Image className="responsive-smaller-icon-font-size" />
            </button>
          )}
          <Button
            onClick={() => {
              if (analyticsEnabled) {
                trackPopupSubmit('svg_upload', filename.trim());
              }
              handleUpload();
            }}
            disabled={!isValidSelection || isUploading}
            className="px-2 sm:px-3 rounded-l-none popup-button-responsive-height responsive-text-font-size !text-primary-foreground focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation flex-shrink-0"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full responsive-smaller-icon-font-size border-b-2 border-white" />
            ) : (
              <ArrowRight className="responsive-smaller-icon-font-size" />
            )}
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Validation error message (real-time) */}
      {validationError && (
        <div className="flex items-center gap-2 text-red-600 responsive-text-font-size mt-1">
          <AlertCircle className="responsive-smaller-icon-font-size" />
          {validationError}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 responsive-text-font-size mt-1">
          <AlertCircle className="responsive-smaller-icon-font-size" />
          {error}
        </div>
      )}

      {/* Upload status */}
      {isUploading && (
        <div className="responsive-text-font-size text-blue-600 mt-1">Uploading...</div>
      )}
    </BasePopup>
  );
};
