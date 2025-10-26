/**
 * Custom hook for tracking analytics with debouncing.
 * Consolidates all analytics functionality in one place.
 */
import { useCallback, useRef } from 'react';
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
  const trackPopupType = useCallback((timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, popupaction_type: string, value: string) => {
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
  const trackPopupSubmit = useCallback((popupaction_type: string, value: string, elementType: 'button' | 'keyboard' = 'button') => {
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
  const trackFormSubmit = useCallback((actionaction_type: string, value: string) => {
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
  const trackError = useCallback((erroraction_type: string, errorMessage: string) => {
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

  return {
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
    // Analytics control
    isAnalyticsEnabled: analyticsService.isAnalyticsEnabled(),
  };
};
