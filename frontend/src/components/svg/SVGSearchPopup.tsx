import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SVGDatasetService } from '@/api_services/svgDataset';
import { BasePopup } from './BasePopup.tsx';

interface SVGFile {
  filename: string;
  name: string;
}

interface SVGSearchPopupProps {
  onClose: () => void;
  onSelect: (filename: string) => Promise<void>;
  position: { x: number; y: number };
}

export const SVGSearchPopup: React.FC<SVGSearchPopupProps> = ({
  onClose,
  onSelect,
  position,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SVGFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SVGFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [imagesPerPage, setImagesPerPage] = useState(5);
  
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRowRef = useRef<HTMLDivElement>(null);

  // Calculate pagination
  const totalPages = Math.ceil(searchResults.length / Math.max(1, imagesPerPage));
  const hasNextPage = currentPage < totalPages - 1;
  const currentPageImages = searchResults.slice(
    currentPage * Math.max(1, imagesPerPage),
    (currentPage + 1) * Math.max(1, imagesPerPage)
  );
  const showPreview = searchResults.length > 0;

  // Dynamically calculate how many images fit in a row
  useEffect(() => {
    const calculateImagesPerPage = () => {
      const container = previewContainerRef.current;
      const row = thumbnailsRowRef.current;
      if (!container || !row) return;

      const containerWidth = row.clientWidth || container.clientWidth;
      const rowStyles = getComputedStyle(row);
      const gapValue = rowStyles.columnGap || rowStyles.gap || '0px';
      const gap = Number.parseFloat(gapValue) || 0;

      const firstChild = row.firstElementChild as HTMLElement | null;
      const thumbWidth = firstChild
        ? firstChild.getBoundingClientRect().width
        : 64;

      const computed = Math.max(1, Math.floor((containerWidth + gap) / (thumbWidth + gap)));
      setImagesPerPage(computed);
    };

    calculateImagesPerPage();
    window.addEventListener('resize', calculateImagesPerPage);

    const container = previewContainerRef.current;
    const row = thumbnailsRowRef.current;
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => calculateImagesPerPage())
      : null;
    if (observer && container) observer.observe(container);
    if (observer && row) observer.observe(row);

    return () => {
      window.removeEventListener('resize', calculateImagesPerPage);
      if (observer) observer.disconnect();
    };
  }, [currentPage]);

  // Clamp current page when results change
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(searchResults.length / Math.max(1, imagesPerPage)));
    setCurrentPage(prev => Math.min(prev, pages - 1));
  }, [imagesPerPage, searchResults.length]);

  // Search for SVG files
  const searchSVGFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await SVGDatasetService.searchSVGFiles(query, 10);
      setSearchResults(data.files || []);
      setCurrentPage(0);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search SVG files');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchSVGFiles(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchSVGFiles]);

  // Handle file selection from dataset
  const handleFileSelect = async (file: SVGFile) => {
    setSelectedFile(file);
    try {
      await onSelect(file.name);
      onClose();
    } catch (err) {
      console.error('File selection failed:', err);
      toast.error('Failed to select file');
    }
  };

  // Handle keyboard events for popup
  const handlePopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && selectedFile) {
      event.preventDefault();
      handleFileSelect(selectedFile);
    }
  };

  // Reset state when popup closes
  useEffect(() => {
    // Reset state on mount and when closed via onClose
    return () => {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFile(null);
      setIsLoading(false);
      setError(null);
      setCurrentPage(0);
    };
  }, []);

  return (
    <BasePopup onClose={onClose} position={position} onKeyDown={handlePopupKeyDown}>
      {/* Search Input */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icon..."
            spellCheck={false}
            className="pl-10 rounded-r-none sm:rounded-r-none border-r-0 h-9 focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none"
            disabled={!!selectedFile}
          />
        </div>
        <div className="flex">
          <Button
            onClick={() => selectedFile && handleFileSelect(selectedFile)}
            disabled={!selectedFile}
            className="px-3 rounded-l-none h-9 focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Preview Grid */}
      {showPreview && (
        <div ref={previewContainerRef} className="relative mt-2">
          {/* Navigation Arrows */}
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
          
          {/* Image Thumbnails */}
          <div ref={thumbnailsRowRef} className="flex gap-2 overflow-hidden justify-center">
            {currentPageImages.map((file, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-16 h-16 border border-gray-200 rounded-md cursor-pointer transition-all duration-200 hover:scale-105 relative group"
                onClick={() => setSelectedFile(file)}
              >
                <div className="w-full h-full p-2 flex items-center justify-center">
                  <img
                    src={`/api/svg-dataset/files/${file.filename}`}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error(`Failed to load: ${file.filename}`);
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                  <ImageIcon className="h-6 w-6 text-gray-400 hidden" />
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 dark:group-hover:bg-opacity-40 rounded-md transition-all duration-200 pointer-events-none" />
                
                {selectedFile?.name === file.name && (
                  <div className="absolute inset-0 ring-2 ring-blue-500 rounded-md pointer-events-none" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="text-sm text-gray-500 mt-1">Searching...</div>
      )}
    </BasePopup>
  );
};
