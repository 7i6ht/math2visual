import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import tutorService from "@/api_services/tutor";
import type { TutorVisual } from "@/api_services/tutor";

export type Message = {
  role: "student" | "tutor";
  content: string;
  visual?: TutorVisual | null;
  streaming?: boolean;
  accumulated?: string;
};

type UseTutorSessionParams = {
  t: TFunction;
};

export function useTutorSession({ t }: UseTutorSessionParams) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const streamCloserRef = useRef<null | (() => void)>(null);
  const streamingBufferRef = useRef<{ raw: string; clean: string }>({ raw: "", clean: "" });

  const isSessionActive = useMemo(() => !!sessionId, [sessionId]);

  const startSession = async (mwp: string) => {
    let started = false;
    try {
      setStarting(true);
      const response = await tutorService.startSession(mwp.trim());
      setSessionId(response.session_id);
      setMessages([
        { role: "student", content: mwp.trim() },
        { role: "tutor", content: response.tutor_message, visual: response.visual },
      ]);
      started = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.unexpectedError");
      toast.error(message);
    } finally {
      setStarting(false);
    }
    return started;
  };

  const stripVisualLanguage = (text: string): string =>
    text
      .replace(/visual_language[\s\S]*/i, "")
      .replace(/VISUAL_REQUEST[\s\S]*/i, "")
      .trimEnd();

  const sendMessage = async (userMessage: string) => {
    if (!sessionId) {
      toast.error(t("tutor.sessionNotFound"));
      return;
    }
    if (!userMessage.trim() || streaming) {
      return;
    }

    const messageText = userMessage.trim();
    setMessages((prev) => [...prev, { role: "student", content: messageText }]);

    const tutorIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "tutor", content: "", streaming: true }]);

    setStreaming(true);
    setSending(true);

    streamingBufferRef.current = { raw: "", clean: "" };

    streamCloserRef.current = tutorService.sendMessageStream(sessionId, messageText, {
      onChunk: (delta) => {
        streamingBufferRef.current.raw += delta || "";
        const cleaned = stripVisualLanguage(streamingBufferRef.current.raw);
        streamingBufferRef.current.clean = cleaned;
        setMessages((prev) => {
          const next = [...prev];
          const idx = Math.min(tutorIndex, next.length - 1);
          if (idx >= 0 && next[idx]) {
            next[idx] = { ...next[idx], content: cleaned, streaming: true };
          }
          return next;
        });
      },
      onDone: (data) => {
        const bufferedClean = streamingBufferRef.current.clean;
        const safeText = bufferedClean || stripVisualLanguage(data.tutor_message || "");
        const safeVisual =
          data.visual && data.visual.dsl_scope
            ? { ...data.visual, dsl_scope: undefined }
            : data.visual;

        setMessages((prev) => {
          const next = [...prev];
          const idx = Math.min(tutorIndex, next.length - 1);
          if (idx >= 0 && next[idx]) {
            next[idx] = {
              role: "tutor",
              content: safeText,
              visual: safeVisual,
              streaming: false,
            };
          }
          return next;
        });
        setStreaming(false);
        setSending(false);
        streamingBufferRef.current = { raw: "", clean: "" };
      },
      onError: (err) => {
        console.error(err);
        toast.error(t("tutor.streamingError"));
        setStreaming(false);
        setSending(false);
        streamingBufferRef.current = { raw: "", clean: "" };
        setMessages((prev) => prev.slice(0, -1));
      },
    });
  };

  const resetSession = () => {
    // Stop any ongoing stream
    if (streamCloserRef.current) {
      streamCloserRef.current();
      streamCloserRef.current = null;
    }
    // Reset all state
    setSessionId(null);
    setMessages([]);
    setStarting(false);
    setSending(false);
    setStreaming(false);
    streamingBufferRef.current = { raw: "", clean: "" };
  };

  return {
    sessionId,
    messages,
    starting,
    sending,
    streaming,
    isSessionActive,
    startSession,
    sendMessage,
    resetSession,
  };
}

