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
        action_type: 'mwp_input_type',
        action_category: 'interaction',
        element_type: 'textarea',
        element_id: 'mwp_input',
      });
    }, 500);
  }, []);

  const trackFormulaType = useCallback(() => {
    if (formulaTimeoutRef.current) {
      clearTimeout(formulaTimeoutRef.current);
    }
    formulaTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        action_type: 'formula_input_type',
        action_category: 'interaction',
        element_type: 'input',
        element_id: 'formula_input',
      });
    }, 500);
  }, []);

  const trackHintType = useCallback(() => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    hintTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        action_type: 'hint_input_type',
        action_category: 'interaction',
        element_type: 'textarea',
        element_id: 'hint_input',
      });
    }, 500);
  }, []);

  const trackDSLType = useCallback(() => {
    if (dslTimeoutRef.current) {
      clearTimeout(dslTimeoutRef.current);
    }
    dslTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        action_type: 'dsl_input_type',
        action_category: 'interaction',
        element_type: 'monaco_editor',
        element_id: 'dsl_editor',
      });
    }, 500);
  }, []);

  const trackDSLScroll = useCallback((direction: 'up' | 'down') => {
    if (dslScrollTimeoutRef.current) {
      clearTimeout(dslScrollTimeoutRef.current);
    }
    dslScrollTimeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        action_type: 'dsl_editor_scroll',
        action_category: 'interaction',
        element_type: 'monaco_editor',
        element_id: 'dsl_editor',
        action_data: { scroll_direction: direction },
      });
    }, 250);
  }, []);

  const trackColumnScroll = useCallback((column: 'left' | 'right', direction: 'up' | 'down') => {
    const timeoutRef = column === 'left' ? leftScrollTimeoutRef : rightScrollTimeoutRef;
    const actionType = column === 'left' ? 'left_column_scroll' : 'right_column_scroll';
    const elementId = column === 'left' ? 'math_problem_column' : 'visualization_column';
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      analyticsService.recordAction({
        action_type: actionType,
        action_category: 'interaction',
        element_type: 'column',
        element_id: elementId,
        action_data: { scroll_direction: direction },
      });
    }, 250);
  }, []);

  const trackTwoColumnLayoutRender = useCallback(() => {
    analyticsService.recordAction({
      action_type: 'two_column_layout_render',
      action_category: 'navigation',
      element_type: 'page',
      element_id: 'two_column_view',
    });
  }, []);

  const trackInitialViewRender = useCallback(() => {
    analyticsService.recordAction({
      action_type: 'initial_view_render',
      action_category: 'navigation',
      element_type: 'page',
      element_id: 'initial_view',
    });
  }, []);

  // Form submission tracking
  const trackFormSubmit = useCallback((formType: 'math_problem' | 'visual_language', data: Record<string, unknown>) => {
    analyticsService.recordAction({
      action_type: 'form_submit',
      action_category: 'generation',
      element_type: 'form',
      element_text: formType,
      action_data: {
        form_type: formType,
        data_length: JSON.stringify(data).length,
        has_mwp: 'mwp' in data,
        has_formula: 'formula' in data,
        has_hint: 'hint' in data,
      },
    });
  }, []);

  // Download tracking
  const trackDownload = useCallback((format: 'svg' | 'png' | 'pdf', filename?: string) => {
    analyticsService.recordAction({
      action_type: 'download',
      action_category: 'download',
      element_type: 'download_button',
      action_data: { format, filename },
    });
  }, []);

  // Upload tracking
  const trackUpload = useCallback((filename: string, fileSize: number, success: boolean) => {
    analyticsService.recordAction({
      action_type: 'upload',
      action_category: 'upload',
      element_type: 'file_input',
      action_data: { filename, file_size: fileSize },
      success: success ? 'true' : 'false',
    });
  }, []);

  // Error tracking
  const trackError = useCallback((errorType: string, errorMessage: string, context?: Record<string, unknown>) => {
    analyticsService.recordAction({
      action_type: 'error',
      action_category: 'error',
      element_type: 'error',
      action_data: { error_type: errorType, context },
      success: 'false',
      error_message: errorMessage,
    });
  }, []);

  // Element click tracking
  const trackElementClick = useCallback((elementId: string, elementType: string, elementText?: string) => {
    analyticsService.recordAction({
      action_type: 'element_click',
      action_category: 'interaction',
      element_id: elementId,
      element_type: elementType,
      element_text: elementText,
    });
  }, []);

  // Element hover tracking
  const trackElementHover = useCallback((elementId: string, elementType: string, hoverType: 'enter' | 'leave', dslPath?: string) => {
    analyticsService.recordAction({
      action_type: 'element_hover',
      action_category: 'interaction',
      element_id: elementId,
      element_type: elementType,
      action_data: { dsl_path: dslPath, hover_type: hoverType },
    });
  }, []);

  // SVG element click tracking
  const trackSVGElementClick = useCallback((elementId: string, elementType: string, dslPath?: string) => {
    analyticsService.recordAction({
      action_type: 'svg_element_click',
      action_category: 'interaction',
      element_id: elementId,
      element_type: elementType,
      action_data: { dsl_path: dslPath },
    });
  }, []);

  // DSL editor click tracking
  const trackDSLEditorClick = useCallback((dslPath: string | null) => {
    analyticsService.recordAction({
      action_type: 'dsl_editor_click',
      action_category: 'interaction',
      element_type: 'monaco_editor',
      element_id: 'dsl_editor',
      action_data: { dsl_path: dslPath },
    });
  }, []);

  // Generation tracking
  const trackGenerationStart = useCallback(async (mwp: string, formula?: string, hint?: string): Promise<string | null> => {
    const generationId = await analyticsService.recordGeneration({
      mwp_text: mwp,
      formula,
      hint,
      success: 'pending',
    });

    analyticsService.recordAction({
      action_type: 'generation_start',
      action_category: 'generation',
      element_type: 'generation_button',
      action_data: {
        mwp_length: mwp.length,
        has_formula: !!formula,
        has_hint: !!hint,
      },
    });

    return generationId;
  }, []);

  const trackGenerationComplete = useCallback((
    generationId: string | null,
    success: boolean,
    generatedDsl?: string,
    errors?: unknown[],
    missingEntities?: string[],
    timing?: { total?: number; dsl?: number; visual?: number }
  ) => {
    if (generationId) {
      analyticsService.updateGeneration(generationId, {
        success: success ? 'success' : 'error',
        generated_dsl: generatedDsl,
        dsl_validation_errors: errors,
        missing_svg_entities: missingEntities,
        generation_time_ms: timing?.total,
        dsl_generation_time_ms: timing?.dsl,
        visual_generation_time_ms: timing?.visual,
      });
    }

    analyticsService.recordAction({
      action_type: 'generation_complete',
      action_category: 'generation',
      element_type: 'generation_result',
      action_data: {
        success,
        has_dsl: !!generatedDsl,
        error_count: errors?.length || 0,
        missing_entities_count: missingEntities?.length || 0,
      },
      success: success ? 'true' : 'false',
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
    trackUpload,
    trackError,
    // Interactions
    trackElementClick,
    trackElementHover,
    trackSVGElementClick,
    trackDSLEditorClick,
    // Generation
    trackGenerationStart,
    trackGenerationComplete,
    // Analytics control
    isAnalyticsEnabled: analyticsService.isAnalyticsEnabled(),
  };
};
