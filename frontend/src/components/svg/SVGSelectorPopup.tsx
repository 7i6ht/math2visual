import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Upload, Image as ImageIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { validateFormatAsync } from '@/utils/validation';
import { SVGDatasetService } from '@/api_services/svgDataset';

interface SVGFile {
  filename: string;
  name: string;
}

interface SVGSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;
  position: { x: number; y: number };
}

export const SVGSelectorPopup: React.FC<SVGSelectorPopupProps> = ({
  isOpen,
  onClose,
  onEmbeddedSVGChange,
  position,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SVGFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SVGFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'search' | 'upload'>('search');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Helper methods for state management
  const clearAllSelections = () => {
    setSelectedFile(null);
    setUploadFile(null);
    setSearchResults([]);
    setShowPreview(false);
    setError(null);
    setValidationError(null);
  };

  const setSearchApproach = (query?: string) => {
    setLastAction('search');
    clearAllSelections();
    if (query !== undefined) {
      setSearchQuery(query);
    }
  };

  const setUploadApproach = (file: File, query?: string) => {
    setLastAction('upload');
    clearAllSelections();
    setUploadFile(file);
    if (query !== undefined) {
      setSearchQuery(query);
    }
  };

  // Calculate how many images fit in a row (assuming 64px width + 8px gap)
  const imagesPerPage = 5; // Adjust based on your popup width
  
  // Calculate pagination
  const totalPages = Math.ceil(searchResults.length / imagesPerPage);
  const hasNextPage = currentPage < totalPages - 1;
  const currentPageImages = searchResults.slice(
    currentPage * imagesPerPage,
    (currentPage + 1) * imagesPerPage
  );

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
      setCurrentPage(0); // Reset to first page when search results change
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
      if (searchQuery.trim()) {
        setSearchApproach();
      }
      searchSVGFiles(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchSVGFiles]);

  // Real-time validation for search input
  useEffect(() => {
    const validateName = async () => {
      if (lastAction === 'upload' && searchQuery.trim()) {
        const validation = await validateFormatAsync(searchQuery.trim());
        setValidationError(validation.valid ? null : validation.error || null);
      } else {
        setValidationError(null);
      }
    };

    const timeoutId = setTimeout(validateName, 500); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [searchQuery, lastAction]);

  // Check if selection is valid for the current approach
  const isValidSelection = lastAction === 'upload'
    ? uploadFile && searchQuery.trim() && !validationError // For upload: need file + valid name
    : selectedFile; // For dataset selection: just need a file
  

  // Handle file selection from dataset
  const handleFileSelect = async (file: SVGFile) => {
    setSearchApproach(file.name);
    setSelectedFile(file);
    
    // Automatically trigger embedded SVG change when selecting from dataset
    try {
      await onEmbeddedSVGChange(file.name);
      onClose();
    } catch (err) {
      console.error('Embedded SVG change failed:', err);
      toast.error('Failed to update type');
    }
  };

  // Handle embedded SVG change
  const handleEmbeddedSVGChange = async () => {
    if (!isValidSelection) {
      setError(lastAction === 'upload' ? 'Please provide a name' : 'Please select a file');
      return;
    }

    // Frontend validation (only for upload approach, dataset selection doesn't need validation)
    if (lastAction === 'upload') {
      const validation = await validateFormatAsync(searchQuery.trim());
      if (!validation.valid) {
        setError(validation.error!);
        return;
      }
    }

    try {
      const typeName = lastAction === 'upload' ? searchQuery.trim() : selectedFile!.name;
      await onEmbeddedSVGChange(typeName);
      onClose();
    } catch (err) {
      console.error('Embedded SVG change failed:', err);
      toast.error('Failed to update type');
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!uploadFile || !searchQuery.trim()) {
      setError('Please select a file and enter a name');
      return;
    }

    // Frontend validation for the file name
    const validation = await validateFormatAsync(searchQuery.trim());
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
      
      // Update the selected file and trigger embedded SVG change
      const newFile = { filename: `${searchQuery.trim()}.svg`, name: searchQuery.trim() };
      setSelectedFile(newFile);
      
      // Trigger embedded SVG change and close popup
      await onEmbeddedSVGChange(searchQuery.trim());
      onClose();
      
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
      // Auto-fill name if not already set
      const nameWithoutExt = file.name.replace(/\.svg$/i, '');
      const query = searchQuery.trim() || nameWithoutExt;
      
      setUploadApproach(file, query);
    }
  };

  // Handle key down
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (lastAction === 'upload') {
        handleUpload();
      } else {
        handleEmbeddedSVGChange();
      }
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      clearAllSelections();
      setIsLoading(false);
      setLastAction('search');
      setIsUploading(false);
      setCurrentPage(0);
      
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
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[320px] max-w-[90vw] max-h-[90vh] overflow-auto p-1"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >

      {/* Search input */}
      <div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lastAction === 'upload' ? 'Enter unique name for the SVG' : 'Search icon...'}
              className="pl-10 rounded-r-none sm:rounded-r-none border-r-0 h-9 focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none"
              disabled={isUploading || (lastAction === 'search' && !!selectedFile)} // Disable when file selected from dataset
            />
          </div>
          <div className="flex">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 rounded-l-none rounded-r-none sm:rounded-r-none border-l-0 h-9 focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              onClick={lastAction === 'upload' ? handleUpload : handleEmbeddedSVGChange}
              disabled={lastAction === 'upload' ? (!uploadFile || !searchQuery.trim() || isUploading || !!validationError) : !isValidSelection}
              className="px-3 rounded-l-none h-9 focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
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

      {/* Image preview row */}
      {showPreview && lastAction === 'search' && (
        <div className="relative mt-2">
          {/* Left arrow button - only show if we can scroll left */}
          {currentPage > 0 && (
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Right arrow button - only show if we can scroll right */}
          {hasNextPage && (
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {/* Image row */}
          <div className="flex gap-2 overflow-hidden">
            {currentPageImages.map((file, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-16 h-16 border border-gray-200 rounded-md cursor-pointer transition-all duration-200 hover:scale-105 relative group"
                onClick={() => handleFileSelect(file)}
              >
                {/* SVG Image */}
                <div className="w-full h-full p-2 flex items-center justify-center">
                  <img
                    src={`/api/svg-dataset/files/${file.filename}`}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                    onLoad={() => {
                      console.log(`✅ SVG loaded successfully: ${file.filename}`);
                    }}
                    onError={(e) => {
                      console.error(`❌ SVG failed to load: ${file.filename}`, e);
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                  <ImageIcon className="h-6 w-6 text-gray-400 hidden" />
                </div>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 dark:group-hover:bg-opacity-40 rounded-md transition-all duration-200 pointer-events-none" />
                
                {/* Selected indicator */}
                {selectedFile?.name === file.name && (
                  <div className="absolute inset-0 ring-2 ring-blue-500 rounded-md pointer-events-none" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Validation error message (real-time) */}
      {validationError && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {validationError}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-sm text-gray-500">Searching...</div>
      )}

    </div>
  );
};
