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
