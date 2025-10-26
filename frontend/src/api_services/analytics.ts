/**
 * Analytics API service for tracking user actions and sessions.
 */
import { BACKEND_API_URL } from '@/config/api';

export interface Action {
  type: string;
  data?: string;
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

  async recordAction(action: Action): Promise<void> {
    if (!this.isEnabled || !this.sessionId) return;

    try {
      // Add UTC timestamp to the action
      const actionWithTimestamp = {
        ...action,
        timestamp: new Date().toISOString(),
      };

      await fetch(`${BACKEND_API_URL}/analytics/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId, ...actionWithTimestamp }),
      });
    } catch (error) {
      console.warn('Failed to record analytics action:', error);
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
