import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SVGDatasetService } from '@/api_services/svgDataset';
import { BasePopup } from './BasePopup.tsx';
import { trackSVGSearchPopupType, trackPopupSubmit, isAnalyticsEnabled } from '@/services/analyticsTracker';

interface SVGFile {
  filename: string;
  name: string;
}

interface SVGSearchPopupProps {
  onClose: () => void;
  onSelect: (filename: string) => Promise<void>;
}

export const SVGSearchPopup: React.FC<SVGSearchPopupProps> = ({
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SVGFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SVGFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [imagesPerPage, setImagesPerPage] = useState(5);
  const [hasCalculatedInitialLayout, setHasCalculatedInitialLayout] = useState(false);
  
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRowRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const analyticsEnabled = isAnalyticsEnabled();

  // Calculate pagination
  const totalPages = Math.ceil(searchResults.length / Math.max(1, imagesPerPage));
  const hasNextPage = currentPage < totalPages - 1;
  const currentPageImages = searchResults.slice(
    currentPage * Math.max(1, imagesPerPage),
    (currentPage + 1) * Math.max(1, imagesPerPage)
  );
  const showPreview = searchResults.length > 0;

  // Calculate how many images fit in a row
  const calculateImagesPerPage = useCallback((isInitialCalculation = false) => {
    const container = previewContainerRef.current;
    const row = thumbnailsRowRef.current;
    if (!container || !row) return;

    const containerWidth = row.clientWidth || container.clientWidth;
    if (containerWidth === 0) return; // Don't calculate if container has no width

    const rowStyles = getComputedStyle(row);
    const gapValue = rowStyles.columnGap || rowStyles.gap || '0px';
    const gap = Number.parseFloat(gapValue) || 0;

    // Try to get actual thumbnail width, fallback to 64px
    const firstChild = row.firstElementChild as HTMLElement | null;
    let thumbWidth = 64; // Default fallback
    
    if (firstChild) {
      const rect = firstChild.getBoundingClientRect();
      if (rect.width > 0) {
        thumbWidth = rect.width;
      }
    }

    const computed = Math.max(1, Math.floor((containerWidth + gap) / (thumbWidth + gap)));
    setImagesPerPage(computed);
    
    if (isInitialCalculation) {
      setHasCalculatedInitialLayout(true);
    }
  }, []);

  // Set up calculation on mount and resize
  useEffect(() => {
    // Calculate immediately
    calculateImagesPerPage();
    
    const handleResize = () => calculateImagesPerPage();
    window.addEventListener('resize', handleResize);

    const container = previewContainerRef.current;
    const row = thumbnailsRowRef.current;
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => calculateImagesPerPage())
      : null;
    if (observer && container) observer.observe(container);
    if (observer && row) observer.observe(row);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [calculateImagesPerPage]);


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
    setHasCalculatedInitialLayout(false); // Reset flag for new search results

    try {
      const data = await SVGDatasetService.searchSVGFiles(query, 20);
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
      if (analyticsEnabled) {
        trackPopupSubmit('svg_search', selectedFile.name, 'keyboard');
      }
      handleFileSelect(selectedFile);
    }
  };

  // Auto-focus search input when popup opens and reset state when popup closes
  useEffect(() => {
    searchInputRef.current?.focus();
    
    // Reset state when popup closes
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
    <BasePopup onClose={onClose} onKeyDown={handlePopupKeyDown} className="popup-search-width max-h-[90vh]">
      {/* Search Input */}
      <div className="flex gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
        <div className="relative flex-1">
          <Search className="absolute left-2 sm:left-3 md:left-4 lg:left-4 xl:left-4.5 2xl:left-5.5 3xl:left-6 4xl:left-6.5 5xl:left-7.5 6xl:left-8.5 7xl:left-9.5 top-1/2 transform -translate-y-1/2 responsive-smaller-icon-font-size text-gray-400" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (analyticsEnabled) {
                trackSVGSearchPopupType(e.target.value);
              }
            }}
            placeholder="Search"
            spellCheck={false}
            className="pl-8 sm:pl-10 md:pl-12 lg:pl-13 xl:pl-14 2xl:pl-15 3xl:pl-17 4xl:pl-18 5xl:pl-20 6xl:pl-22 7xl:pl-24 rounded-r-none border-r-0 popup-button-responsive-height responsive-text-font-size focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation"
            disabled={!!selectedFile}
          />
        </div>
        <Button
          onClick={() => {
            if (selectedFile) {
              if (analyticsEnabled) {
                trackPopupSubmit('svg_search', selectedFile.name);
              }
              handleFileSelect(selectedFile);
            }
          }}
          disabled={!selectedFile}
          className="px-2 sm:px-3 rounded-l-none popup-button-responsive-height responsive-text-font-size !text-primary-foreground focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation flex-shrink-0"
        >
          <ArrowRight className="responsive-smaller-icon-font-size" />
        </Button>
      </div>

      {/* Image Preview Grid */}
      {showPreview && (
        <div ref={previewContainerRef} className="relative mt-2 overflow-visible">
          {/* Navigation Arrows */}
          {currentPage > 0 && (
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 sm:p-1 shadow-md hover:bg-gray-50 transition-colors touch-manipulation"
            >
              <svg className="responsive-smaller-icon-font-size text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {hasNextPage && (
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 sm:p-1 shadow-md hover:bg-gray-50 transition-colors touch-manipulation"
            >
              <svg className="responsive-smaller-icon-font-size text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {/* Image Thumbnails */}
          <div ref={thumbnailsRowRef} className="flex gap-2 overflow-visible justify-center">
            {currentPageImages.map((file, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 border border-gray-200 rounded-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 relative group touch-manipulation"
                onClick={() => setSelectedFile(file)}
                onDoubleClick={() => handleFileSelect(file)}
              >
                <div className="w-full h-full p-2 flex items-center justify-center">
                  <img
                    src={`/api/svg-dataset/files/${file.filename}`}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                    onLoad={() => {
                      // Only recalculate once when we haven't done the initial calculation yet
                      if (!hasCalculatedInitialLayout) {
                        calculateImagesPerPage(true);
                      }
                    }}
                    onError={(e) => {
                      console.error(`Failed to load: ${file.filename}`);
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                  <ImageIcon className="responsive-smaller-icon-font-size text-gray-400 hidden" />
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
        <div className="flex items-center gap-2 text-red-600 responsive-text-font-size mt-1">
          <AlertCircle className="responsive-smaller-icon-font-size" />
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="responsive-text-font-size text-gray-500 mt-1">Searching...</div>
      )}
    </BasePopup>
  );
};
