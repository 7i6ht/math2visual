import React, { useState, useEffect, useRef } from 'react';
import { Upload, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateFormatAsync } from '@/utils/validation';
import { SVGDatasetService } from '@/api_services/svgDataset';
import { BasePopup } from './BasePopup.tsx';

interface SVGUploadPopupProps {
  onClose: () => void;
  onUpload: (filename: string) => Promise<void>;
  position: { x: number; y: number };
}

export const SVGUploadPopup: React.FC<SVGUploadPopupProps> = ({
  onClose,
  onUpload,
  position,
}) => {
  const [filename, setFilename] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle key down
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleUpload();
    }
  };

  // Reset state when popup closes
  useEffect(() => {
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
    <BasePopup onClose={onClose} position={position}>
      {/* Upload Form */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
        <div className="relative flex-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded p-0.5 transition-colors"
            title="Choose SVG file"
            disabled={isUploading}
          >
            <Upload className="h-3 w-3" />
          </button>
          <Input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter name..."
            className="pl-10 rounded-r-none sm:rounded-r-none border-r-0 h-9 focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none"
            disabled={isUploading}
          />
        </div>
        <div className="flex items-center">
          {uploadFile && (
            <button
              className="text-xs text-gray-600 px-2 py-1 border border-gray-200 rounded mr-1 truncate max-w-[90px] hover:bg-gray-50 transition-colors"
              title={uploadFile.name}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {uploadFile.name}
            </button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!isValidSelection || isUploading}
            className="px-3 rounded-l-none h-9 focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <ArrowRight className="h-4 w-4" />
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
        <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
          <AlertCircle className="h-4 w-4" />
          {validationError}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Upload status */}
      {isUploading && (
        <div className="text-sm text-blue-600 mt-1">Uploading...</div>
      )}
    </BasePopup>
  );
};
