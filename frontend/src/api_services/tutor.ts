import { BACKEND_API_URL as API_BASE_URL } from "@/config/api";
import { getHeadersWithLanguage } from "@/utils/apiHelpers";
import { ApiError } from "@/api_services/generation";

export type TutorVisual = {
  variant: "formal" | "intuitive";
  svg?: string | null;
  error?: string | null;
  missing_svg_entities?: string[];
  reason?: string;
  dsl_scope?: string;
  is_parse_error?: boolean;
};

export type TutorStartResponse = {
  session_id: string;
  tutor_message: string;
  visual_language: string;
  visual?: TutorVisual | null;
};

export type TutorMessageResponse = {
  session_id: string;
  tutor_message: string;
  visual?: TutorVisual | null;
};

const tutorService = {
  async startSession(mwp: string, formula?: string, hint?: string): Promise<TutorStartResponse> {
    const response = await fetch(`${API_BASE_URL}/tutor/start`, {
      method: "POST",
      headers: getHeadersWithLanguage(),
      body: JSON.stringify({ mwp, formula, hint }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new ApiError(result.error || "Failed to start tutor session", response.status);
    }
    return result as TutorStartResponse;
  },

  async sendMessage(sessionId: string, message: string): Promise<TutorMessageResponse> {
    const response = await fetch(`${API_BASE_URL}/tutor/message`, {
      method: "POST",
      headers: getHeadersWithLanguage(),
      body: JSON.stringify({ session_id: sessionId, message }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new ApiError(result.error || "Failed to send tutor message", response.status);
    }
    return result as TutorMessageResponse;
  },
};

export { tutorService };
export default tutorService;


