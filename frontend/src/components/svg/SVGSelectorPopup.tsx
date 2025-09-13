import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { validateEntityTypeNameAsync } from '@/utils/validation';
import { SVGDatasetService } from '@/api_services/svgDataset';

interface SVGFile {
  filename: string;
  name: string;
}

interface SVGSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentEntityType: string;
  onEntityTypeChange: (oldType: string, newType: string) => Promise<void>;
  position: { x: number; y: number };
}

export const SVGSelectorPopup: React.FC<SVGSelectorPopupProps> = ({
  isOpen,
  onClose,
  currentEntityType,
  onEntityTypeChange,
  position,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SVGFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SVGFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Search for SVG files
  const searchSVGFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowPreview(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await SVGDatasetService.searchSVGFiles(query, 8);
      setSearchResults(data.files || []);
      setShowPreview(data.files && data.files.length > 0);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search SVG files');
      setSearchResults([]);
      setShowPreview(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSVGFiles(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchSVGFiles]);

  // Real-time validation for search input
  useEffect(() => {
    const validateName = async () => {
      if (isUploadMode && searchQuery.trim()) {
        const validation = await validateEntityTypeNameAsync(searchQuery.trim());
        setValidationError(validation.valid ? null : validation.error || null);
      } else {
        setValidationError(null);
      }
    };

    const timeoutId = setTimeout(validateName, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isUploadMode]);

  // Check if selection is valid for the current mode
  const isValidSelection = isUploadMode 
    ? selectedFile && !validationError // For upload: need file + valid name
    : selectedFile; // For dataset selection: just need a file
  

  // Handle file selection
  const handleFileSelect = (file: SVGFile) => {
    setSelectedFile(file);
    if (!isUploadMode) {
      setSearchQuery(file.name);
      setShowPreview(false);
      setSearchResults([]); // Clear search results when manually selecting from dataset
    }
    setError(null);
  };

  // Handle entity type change
  const handleEntityTypeChange = async () => {
    if (!isValidSelection) {
      setError(isUploadMode ? 'Please provide a valid and unique name' : 'Please select a file');
      return;
    }

    // Frontend validation (only for upload mode, dataset selection doesn't need validation)
    if (isUploadMode) {
      const validation = await validateEntityTypeNameAsync(searchQuery.trim());
      if (!validation.valid) {
        setError(validation.error!);
        return;
      }
    }

    try {
      const entityName = isUploadMode ? searchQuery.trim() : selectedFile!.name;
      await onEntityTypeChange(currentEntityType, entityName);
      onClose();
    } catch (err) {
      console.error('Entity type change failed:', err);
      toast.error('Failed to update entity type');
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!uploadFile || !searchQuery.trim()) {
      setError('Please select a file and enter a name');
      return;
    }

    // Frontend validation for the entity type name
    const validation = await validateEntityTypeNameAsync(searchQuery.trim());
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await SVGDatasetService.uploadSVG(uploadFile, searchQuery.trim());

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // toast.success('SVG uploaded successfully');
      
      // Update the selected file and switch to selection mode
      const newFile = { filename: `${searchQuery.trim()}.svg`, name: searchQuery.trim() };
      setSelectedFile(newFile);
      setIsUploadMode(false);
      setUploadFile(null);
      setShowPreview(false);
      setError(null);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto-fill name if not already set
      if (!searchQuery.trim()) {
        const nameWithoutExt = file.name.replace(/\.svg$/i, '');
        setSearchQuery(nameWithoutExt);
      }
    }
  };

  // Handle key down
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (isUploadMode) {
        handleUpload();
      } else {
        handleEntityTypeChange();
      }
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFile(null);
      setIsLoading(false);
      setShowPreview(false);
      setError(null);
      setIsUploadMode(false);
      setUploadFile(null);
      setIsUploading(false);
      setValidationError(null);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[400px] max-w-[90vw] max-h-[90vh] overflow-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Change SVG Entity Type</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Current entity type */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700">Current Entity Type:</label>
        <Badge variant="secondary" className="ml-2">{currentEntityType}</Badge>
      </div>

      {/* Search input */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 block mb-2">
          {isUploadMode ? 'New Entity Type Name:' : 'Search SVG Files:'}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isUploadMode ? 'Enter unique name for the SVG' : 'Search for SVG files...'}
              className="pl-10"
              disabled={isUploading || (!isUploadMode && !!selectedFile)} // Disable when file selected from dataset
            />
          </div>
          <Button
            variant={isUploadMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsUploadMode(!isUploadMode)}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Upload mode */}
      {isUploadMode && (
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Select SVG File:
          </label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {uploadFile ? uploadFile.name : 'Choose File'}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !searchQuery.trim() || isUploading || !!validationError}
              className="px-6"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      )}

      {/* Preview section */}
      {showPreview && !isUploadMode && (
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Preview ({searchResults.length} results):
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {searchResults.map((file, index) => (
              <Card
                key={index}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedFile?.name === file.name
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleFileSelect(file)}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected file display */}
      {selectedFile && !showPreview && (
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Selected:
          </label>
          <Card className="p-3 bg-green-50 border-green-200">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Validation error message (real-time) */}
      {validationError && (
        <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {validationError}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-4 text-sm text-gray-500">Searching...</div>
      )}

      {/* Action buttons */}
      {!isUploadMode && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleEntityTypeChange}
            disabled={!isValidSelection}
          >
            Change Entity Type
          </Button>
        </div>
      )}
    </div>
  );
};
