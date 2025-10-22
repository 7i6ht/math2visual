/**
 * Analytics API service for tracking user actions and sessions.
 */
import { BACKEND_API_URL } from '@/config/api';

export interface UserAction {
  action_type: string;
  action_category: 'generation' | 'interaction' | 'navigation' | 'download' | 'upload' | 'error';
  element_id?: string;
  element_type?: string;
  element_text?: string;
  page_url?: string;
  action_data?: Record<string, unknown>;
  duration_ms?: number;
  success?: 'true' | 'false';
  error_message?: string;
}

export interface GenerationSession {
  mwp_text: string;
  formula?: string;
  hint?: string;
  generated_dsl?: string;
  dsl_validation_errors?: unknown[];
  missing_svg_entities?: string[];
  success?: 'pending' | 'success' | 'error';
  error_message?: string;
  generation_time_ms?: number;
  dsl_generation_time_ms?: number;
  visual_generation_time_ms?: number;
}

class AnalyticsService {
  private sessionId: string | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.initializeSession();
  }

  private initializeSession(): void {
    this.sessionId = localStorage.getItem('math2visual_session_id');
    
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
      localStorage.setItem('math2visual_session_id', this.sessionId);
    }

    this.registerSession();
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
  }

  private async registerSession(): Promise<void> {
    if (!this.isEnabled || !this.sessionId) return;

    try {
      await fetch(`${BACKEND_API_URL}/analytics/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId }),
      });
    } catch (error) {
      console.warn('Failed to register analytics session:', error);
      this.isEnabled = false;
    }
  }

  async recordAction(action: UserAction): Promise<void> {
    if (!this.isEnabled || !this.sessionId) return;

    try {
      await fetch(`${BACKEND_API_URL}/analytics/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId, ...action }),
      });
    } catch (error) {
      console.warn('Failed to record analytics action:', error);
    }
  }

  async recordGeneration(generation: GenerationSession): Promise<string | null> {
    if (!this.isEnabled || !this.sessionId) return null;

    try {
      const response = await fetch(`${BACKEND_API_URL}/analytics/generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId, ...generation }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.generation_id;
      }
    } catch (error) {
      console.warn('Failed to record generation session:', error);
    }

    return null;
  }

  async updateGeneration(generationId: string, updates: Partial<GenerationSession>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await fetch(`${BACKEND_API_URL}/analytics/generation/${generationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.warn('Failed to update generation session:', error);
    }
  }

  trackFormSubmit(formType: 'math_problem' | 'visual_language', data: Record<string, unknown>): void {
    this.recordAction({
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
  }

  trackDownload(format: 'svg' | 'png' | 'pdf', filename?: string): void {
    this.recordAction({
      action_type: 'download',
      action_category: 'download',
      element_type: 'download_button',
      action_data: { format, filename },
    });
  }

  trackUpload(filename: string, fileSize: number, success: boolean): void {
    this.recordAction({
      action_type: 'upload',
      action_category: 'upload',
      element_type: 'file_input',
      action_data: { filename, file_size: fileSize },
      success: success ? 'true' : 'false',
    });
  }

  trackError(errorType: string, errorMessage: string, context?: Record<string, unknown>): void {
    this.recordAction({
      action_type: 'error',
      action_category: 'error',
      element_type: 'error',
      action_data: { error_type: errorType, context },
      success: 'false',
      error_message: errorMessage,
    });
  }

  trackElementClick(elementId: string, elementType: string, elementText?: string): void {
    this.recordAction({
      action_type: 'element_click',
      action_category: 'interaction',
      element_id: elementId,
      element_type: elementType,
      element_text: elementText,
    });
  }

  trackDSLEditorClick(dslPath: string | null): void {
    this.recordAction({
      action_type: 'dsl_editor_click',
      action_category: 'interaction',
      element_type: 'monaco_editor',
      element_id: 'dsl_editor',
      action_data: { dsl_path: dslPath },
    });
  }

  async trackGenerationStart(mwp: string, formula?: string, hint?: string): Promise<string | null> {
    const generationId = await this.recordGeneration({
      mwp_text: mwp,
      formula,
      hint,
      success: 'pending',
    });

    this.recordAction({
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
  }

  trackGenerationComplete(
    generationId: string | null,
    success: boolean,
    generatedDsl?: string,
    errors?: unknown[],
    missingEntities?: string[],
    timing?: { total?: number; dsl?: number; visual?: number }
  ): void {
    if (generationId) {
      this.updateGeneration(generationId, {
        success: success ? 'success' : 'error',
        generated_dsl: generatedDsl,
        dsl_validation_errors: errors,
        missing_svg_entities: missingEntities,
        generation_time_ms: timing?.total,
        dsl_generation_time_ms: timing?.dsl,
        visual_generation_time_ms: timing?.visual,
      });
    }

    this.recordAction({
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
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  isAnalyticsEnabled(): boolean {
    return this.isEnabled;
  }
}

export const analyticsService = new AnalyticsService();
