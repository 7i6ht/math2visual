/**
 * Custom hook for tracking analytics with debouncing.
 * Consolidates all analytics functionality in one place.
 */
import { useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { analyticsService } from '@/api_services/analytics';

export const useAnalytics = () => {
  const mwpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formulaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dslTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const namePopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entityQuantityPopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgSearchPopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgUploadPopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dslScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Input typing tracking with debouncing
  const trackMWPType = useCallback(() => {
    if (mwpTimeoutRef.current) {
      clearTimeout(mwpTimeoutRef.current);
    }
    mwpTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        type: 'mwp_input_type'
      });
    }, 500);
  }, []);

  const trackFormulaType = useCallback(() => {
    if (formulaTimeoutRef.current) {
      clearTimeout(formulaTimeoutRef.current);
    }
    formulaTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        type: 'formula_input_type'
      });
    }, 500);
  }, []);

  const trackHintType = useCallback(() => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    hintTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        type: 'hint_input_type'
      });
    }, 500);
  }, []);

  const trackDSLType = useCallback(() => {
    if (dslTimeoutRef.current) {
      clearTimeout(dslTimeoutRef.current);
    }
    dslTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        type: 'dsl_editor_type'
      });
    }, 500);
  }, []);

  const trackDSLScroll = useCallback((direction: 'up' | 'down') => {
    if (dslScrollTimeoutRef.current) {
      clearTimeout(dslScrollTimeoutRef.current);
    }
    dslScrollTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        type: `dsl_editor_scroll_${direction}`,
      });
    }, 250);
  }, []);

  const trackColumnScroll = useCallback((column: 'left' | 'right', direction: 'up' | 'down') => {
    const timeoutRef = column === 'left' ? leftScrollTimeoutRef : rightScrollTimeoutRef;
    const actionType = column === 'left' ? 'math_problem_column_scroll' : 'visualization_column_scroll';
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        type: `${actionType}_${direction}`,
      });
    }, 250);
  }, []);

  const trackTwoColumnLayoutRender = useCallback(() => {
    analyticsService.recordAction({
      type: 'two_column_layout_render',
    });
  }, []);

  const trackInitialViewRender = useCallback(() => {
    analyticsService.recordAction({
      type: 'initial_view_render'
    });
  }, []);

  // Element click tracking
  const trackElementClick = useCallback((action_type: string, action_data?: string) => {
    analyticsService.recordAction({
      type: action_type,
      data: JSON.stringify({key: action_data}),
    });
  }, []);

  // Element hover tracking
  const trackSVGElementHover = useCallback((action_type: string, dslPath?: string) => {
    analyticsService.recordAction({
      type: action_type,
      data: JSON.stringify({ dsl_path: dslPath }),
    });
  }, []);

  // SVG element click tracking
  const trackSVGElementClick = useCallback((action_type: string, dslPath?: string) => {
    analyticsService.recordAction({
      type: action_type,
      data: JSON.stringify({ dsl_path: dslPath }),
    });
  }, []);

  // Popup tracking
  const trackOpenPopup = useCallback((popupType: 'name' | 'entity_quantity' | 'svg_selector', dslPath: string) => {
    const actionType = `${popupType}_popup_open`;    
    analyticsService.recordAction({
      type: actionType,
      data: JSON.stringify({ dsl_path: dslPath }),
    });
  }, []);

  // Generic popup typing tracking with debouncing
  const trackPopupType = useCallback((timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, popupType: string, value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        type: `${popupType}_popup_type`,
        data: JSON.stringify({ value: value }),
      });
    }, 500);
  }, []);

  // Specific popup typing tracking functions
  const trackNamePopupType = useCallback((value: string) => {
    trackPopupType(namePopupTimeoutRef, 'name', value);
  }, [trackPopupType]);

  const trackEntityQuantityPopupType = useCallback((value: string) => {
    trackPopupType(entityQuantityPopupTimeoutRef, 'entity_quantity', value);
  }, [trackPopupType]);

  const trackSVGSearchPopupType = useCallback((value: string) => {
    trackPopupType(svgSearchPopupTimeoutRef, 'svg_search', value);
  }, [trackPopupType]);

  const trackSVGUploadPopupType = useCallback((value: string) => {
    trackPopupType(svgUploadPopupTimeoutRef, 'svg_upload', value);
  }, [trackPopupType]);

  // Popup submission tracking
  const trackPopupSubmit = useCallback((popupType: string, value: string, elementType: 'button' | 'keyboard' = 'button') => {
    const actionType = `${popupType}_popup_${elementType}_submit`;
    
    analyticsService.recordAction({
      type: actionType,
      data: JSON.stringify({ value: value }),
    });
  }, []);

  const trackDragOver = useCallback((action_type: string, dslPath?: string) => {
    analyticsService.recordAction({
      type: action_type,
      data: JSON.stringify({ dsl_path: dslPath }),
    });
  }, []);

  const trackDrop = useCallback((action_type: string, dslPath?: string) => {
    analyticsService.recordAction({
      type: action_type,
      data: JSON.stringify({ dsl_path: dslPath }),
    });
  }, []);

  // Form submission tracking
  const trackFormSubmit = useCallback((actionType: string, value: string) => {
    analyticsService.recordAction({
      type: actionType,
      data: JSON.stringify({ value: value }),
    });
  }, []);

  // Download tracking
  const trackDownload = useCallback((format: 'svg' | 'png' | 'pdf', filename?: string) => {
    analyticsService.recordAction({
      type: `download_${format}_button_click`,
      data: JSON.stringify({ filename: filename }),
    });
  }, []);

  // Error tracking
  const trackError = useCallback((errorType: string, errorMessage: string) => {
    analyticsService.recordAction({
      type: errorType,
      data: JSON.stringify({ error_message: errorMessage }),
    });
  }, []);

  // DSL editor click tracking
  const trackDSLEditorClick = useCallback((dslPath: string | null) => {
    analyticsService.recordAction({
      type: 'dsl_editor_click',
      data: JSON.stringify({ dsl_path: dslPath }),
    });
  }, []);

  // Generation tracking
  const trackGenerationStart = useCallback(async (mwp: string, formula?: string, hint?: string) => {
    analyticsService.recordAction({
      type: 'generation_start',
      data: JSON.stringify({ mwp: mwp, formula: formula, hint: hint }),
    });
  }, []);

  const trackGenerationComplete = useCallback((
    success: boolean,
    errorFormal?: string | null,
    errorIntuitive?: string | null,
    dsl?: string,
    missingEntities?: string[],
  ) => {
    analyticsService.recordAction({
      type: 'generation_complete',
      data: JSON.stringify({ success: success, error_formal: errorFormal, error_intuitive: errorIntuitive, dsl: dsl, missing_svg_entities: missingEntities }),
    });
  }, []);

  // Cursor tracking
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const element = event.target as HTMLElement;
    const elementId = element.id || undefined;
    const elementType = element.tagName.toLowerCase() || undefined;

    analyticsService.recordCursorPosition(event.clientX, event.clientY, {
      element_id: elementId,
      element_type: elementType,
    });
  }, []);

  // Start cursor tracking
  const startCursorTracking = useCallback(() => {
    // Track cursor movements
    document.addEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Stop cursor tracking
  const stopCursorTracking = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Wait for all images to load before capturing screenshot
  const waitForImagesToLoad = () => {
    return new Promise<void>((resolve) => {
      const images = document.querySelectorAll('img');
      let loadedCount = 0;
      const totalImages = images.length;

      if (totalImages === 0) {
        resolve();
        return;
      }

      images.forEach((img) => {
        if (img.complete) {
          loadedCount++;
        } else {
          img.addEventListener('load', () => {
            loadedCount++;
            if (loadedCount === totalImages) {
              // Small delay to ensure all images are fully rendered
              setTimeout(() => resolve(), 100);
            }
          });
          img.addEventListener('error', () => {
            loadedCount++;
            if (loadedCount === totalImages) {
              setTimeout(() => resolve(), 100);
            }
          });
        }
      });

      if (loadedCount === totalImages) {
        setTimeout(() => resolve(), 100);
      }
    });
  };

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    try {
      // Wait for all images (including the logo) to load before capturing
      await waitForImagesToLoad();

      // Capture the viewport (what user actually sees) using html2canvas
      const canvas = await html2canvas(document.documentElement, {
        // Capture the viewport dimensions (what user sees)
        width: window.innerWidth,
        height: window.innerHeight,
        // Use the device's pixel ratio for better quality
        scale: window.devicePixelRatio || 1,
        // Improve rendering quality
        useCORS: true,
        allowTaint: false, // Keep canvas "clean" to allow toDataURL()
        backgroundColor: '#ffffff', // Ensure white background
        logging: false, // Disable console logs from html2canvas
        // Additional options for better rendering
        foreignObjectRendering: true,
        removeContainer: true,
      });
      
      const dataURL = canvas.toDataURL('image/png');
      const width = canvas.width;
      const height = canvas.height;
      
      await analyticsService.uploadScreenshot(dataURL, width, height);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCursorTracking();
    };
  }, [stopCursorTracking]);

  return {
    isFirstRender,
    setIsFirstRender: (value: boolean) => { isFirstRender.current = value; },
    // Input typing
    trackMWPType,
    trackFormulaType,
    trackHintType,
    trackDSLType,
    trackDSLScroll,
    trackColumnScroll,
    // Navigation
    trackInitialViewRender,
    trackTwoColumnLayoutRender,
    // Form actions
    trackFormSubmit,
    trackDownload,
    trackError,
    // Interactions
    trackElementClick,
    trackSVGElementHover,
    trackSVGElementClick,
    trackDSLEditorClick,
    trackOpenPopup,
    trackNamePopupType,
    trackEntityQuantityPopupType,
    trackSVGSearchPopupType,
    trackSVGUploadPopupType,
    trackPopupSubmit,
    // Drag and drop
    trackDragOver,
    trackDrop,
    // Generation
    trackGenerationStart,
    trackGenerationComplete,
    // Cursor tracking and screenshots
    startCursorTracking,
    stopCursorTracking,
    captureScreenshot,
    // Analytics control
    isAnalyticsEnabled: analyticsService.isAnalyticsEnabled(),
  };
};
