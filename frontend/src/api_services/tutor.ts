import { BACKEND_API_URL as API_BASE_URL } from "@/config/api";
import { getHeadersWithLanguage } from "@/utils/apiHelpers";
import { ApiError } from "@/api_services/generation";

export type TutorVisual = {
  variant: "formal" | "intuitive";
  svg?: string | null;
  error?: string | null;
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

type StreamCallbacks = {
  onChunk: (delta: string) => void;
  onDone: (data: TutorMessageResponse) => void;
  onError?: (error: unknown) => void;
};

const tutorService = {
  async startSession(mwp: string): Promise<TutorStartResponse> {
    const response = await fetch(`${API_BASE_URL}/tutor/start`, {
      method: "POST",
      headers: getHeadersWithLanguage(),
      body: JSON.stringify({ mwp }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new ApiError(result.error || "Failed to start tutor session", response.status);
    }
    return result as TutorStartResponse;
  },

  sendMessageStream(sessionId: string, message: string, callbacks: StreamCallbacks) {
    const controller = new AbortController();

    const startStream = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tutor/message/stream`, {
          method: "POST",
          headers: getHeadersWithLanguage(),
          body: JSON.stringify({ session_id: sessionId, message }),
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) {
          const errorBody = contentType.includes("application/json")
            ? await response.json().catch(() => null)
            : null;
          throw new ApiError(errorBody?.error || "Failed to stream tutor message", response.status);
        }

        if (!response.body) {
          throw new Error("Streaming not supported in this browser.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;

        while (!finished) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });

          let boundary;
          while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            if (!rawEvent) continue;

            const payloadStr = rawEvent.replace(/^data:\s*/, "");
            if (!payloadStr) continue;

            let data: TutorMessageResponse & { type?: string; delta?: string; error?: string };
            try {
              data = JSON.parse(payloadStr);
            } catch (parseError) {
              callbacks.onError?.(parseError);
              finished = true;
              break;
            }

            if (data.type === "chunk") {
              callbacks.onChunk(data.delta || "");
            } else if (data.type === "done") {
              callbacks.onDone({
                session_id: data.session_id,
                tutor_message: data.tutor_message,
                visual: data.visual,
              });
              finished = true;
              break;
            } else if (data.type === "error") {
              callbacks.onError?.(new Error(data.error || "Streaming error"));
              finished = true;
              break;
            }
          }

          if (done) {
            break;
          }
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        callbacks.onError?.(error);
      }
    };

    void startStream();

    return () => controller.abort();
  },
};

export { tutorService };
export default tutorService;


