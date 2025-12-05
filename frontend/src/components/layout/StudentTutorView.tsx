import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import tutorService from "@/api_services/tutor";
import type { TutorVisual } from "@/api_services/tutor";
import { Bot, Mic, Square, User } from "lucide-react";

type Message = {
  role: "student" | "tutor";
  content: string;
  visual?: TutorVisual | null;
  streaming?: boolean;
  accumulated?: string;
};

type Props = {
  onBack?: () => void;
};

export function StudentTutorView({ onBack }: Props) {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mwp, setMwp] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const streamCloserRef = useRef<null | (() => void)>(null);
  const streamingBufferRef = useRef<{ raw: string; clean: string }>({ raw: "", clean: "" });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const isSessionActive = useMemo(() => !!sessionId, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect voice support once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
    }
  }, []);

  const appendMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleStart = async () => {
    if (!mwp.trim()) {
      toast.error(t("tutor.enterMwpPlaceholder"));
      return;
    }
    try {
      setStarting(true);
      const response = await tutorService.startSession(mwp.trim());
      setSessionId(response.session_id);
      setMessages([
        { role: "student", content: mwp.trim() },
        { role: "tutor", content: response.tutor_message, visual: response.visual },
      ]);
      setInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.unexpectedError");
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async () => {
    if (!sessionId) {
      toast.error(t("tutor.sessionNotFound"));
      return;
    }
    if (!input.trim() || streaming) {
      return;
    }

    const userMessage = input.trim();
    appendMessage({ role: "student", content: userMessage });
    setInput("");

    // Provisional tutor message entry for streaming updates
    const tutorIndex = messages.length + 1; // after student append
    setMessages((prev) => [...prev, { role: "tutor", content: "", streaming: true }]);

    setStreaming(true);
    setSending(true);

    const stripVisualLanguage = (text: string): string => {
      if (!text) return "";
      return text
        // Remove anything starting from visual_language
        .replace(/visual_language[\s\S]*/i, "")
        // Remove anything starting from VISUAL_REQUEST
        .replace(/VISUAL_REQUEST[\s\S]*/i, "")
        .trimEnd();
    };

    streamingBufferRef.current = { raw: "", clean: "" };

    streamCloserRef.current = tutorService.sendMessageStream(
      sessionId,
      userMessage,
      {
        onChunk: (delta) => {
          streamingBufferRef.current.raw += delta || "";
          const cleaned = stripVisualLanguage(streamingBufferRef.current.raw);
          streamingBufferRef.current.clean = cleaned;
          setMessages((prev) => {
            const next = [...prev];
            const idx = Math.min(tutorIndex, next.length - 1);
            if (idx >= 0 && next[idx]) {
              next[idx] = {
                ...next[idx],
                content: cleaned,
                streaming: true,
              };
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
          // Remove provisional tutor message on error
          setMessages((prev) => prev.slice(0, -1));
        },
      }
    );
  };

  const renderVisual = (visual?: TutorVisual | null) => {
    if (!visual || !visual.svg) return null;
    const title =
      visual.variant === "formal"
        ? t("tutor.visualTitleFormal")
        : t("tutor.visualTitleIntuitive");
    return (
      <div className="mt-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="responsive-text-font-size font-semibold mb-2">{title}</div>
        <div
          className="w-full overflow-hidden rounded-md border bg-white"
          dangerouslySetInnerHTML={{ __html: visual.svg }}
        />
        {visual.reason && (
          <p className="mt-2 responsive-text-font-size text-muted-foreground">{visual.reason}</p>
        )}
      </div>
    );
  };

  const handleVoiceToggle = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t("tutor.voiceNotSupported"));
      return;
    }

    if (listening) {
      // Stop any active recognition
      if ((window as any).__m2vRecognitionInstance) {
        (window as any).__m2vRecognitionInstance.stop();
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      (window as any).__m2vRecognitionInstance = recognition;
      recognition.continuous = false;
      recognition.lang = navigator.language || "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev}\n${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        toast.error(t("tutor.voiceError"));
      setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      setListening(true);
      recognition.start();
    } catch (error) {
      setListening(false);
      toast.error(t("tutor.voiceError"));
    }
  };

  return (
    <div className="w-full px-3 py-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 5xl:px-32">
      <div className="flex items-center justify-between mb-6">
        <h2 className="responsive-text-font-size font-semibold">{t("landing.student")}</h2>
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            className="button-responsive-size !responsive-text-font-size px-3 py-2 md:px-4 md:py-2.5 lg:px-5 lg:py-3 xl:px-6 xl:py-3.5"
          >
            {t("common.close")}
          </Button>
        )}
      </div>

      {!isSessionActive && (
        <div className="space-y-3 max-w-3xl">
          <label className="block responsive-text-font-size font-medium text-foreground">
            {t("tutor.enterMwpLabel")}
          </label>
          <Textarea
            value={mwp}
            onChange={(e) => setMwp(e.target.value)}
            placeholder={t("tutor.enterMwpPlaceholder")}
            spellCheck={false}
            className="min-h-[160px] responsive-text-font-size"
          />
          <div className="flex gap-3">
            <Button 
              onClick={handleStart} 
              disabled={starting}
              className="min-w-[200px] !responsive-text-font-size button-responsive-size px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 xl:px-12 xl:py-6"
            >
              {starting ? t("common.loading") : t("tutor.startSession")}
            </Button>
          </div>
        </div>
      )}

      {isSessionActive && (
        <div className="mt-4 grid gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm min-h-[320px] flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((msg, idx) => {
                const isStudent = msg.role === "student";
                const alignment = isStudent ? "justify-end" : "justify-start";
                const slide = isStudent ? "slide-in-from-right-4" : "slide-in-from-left-4";
                return (
                  <div key={idx} className={`space-y-2 flex ${alignment} w-full`}>
                    {!isStudent && (
                      <div className="mr-2 flex items-start select-none">
                        <Bot className="responsive-icon-font-size text-muted-foreground" />
                      </div>
                    )}
                    <div
                      className={`inline-block rounded-lg px-3 py-2 max-w-[80%] ${
                        isStudent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      } animate-in fade-in-0 ${slide} duration-200`}
                    >
                      <div className="responsive-text-font-size whitespace-pre-wrap flex items-center gap-2">
                        <span>{msg.content}</span>
                        {msg.streaming && (
                          <span className="inline-flex items-center gap-1 align-middle">
                            <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                            <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                          </span>
                        )}
                      </div>
                    </div>
                    {isStudent && (
                      <div className="ml-2 flex items-start select-none">
                        <User className="responsive-icon-font-size text-primary" />
                      </div>
                    )}
                    {renderVisual(msg.visual)}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-4 space-y-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("tutor.sendPlaceholder")}
                spellCheck={false}
                className="responsive-text-font-size"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex gap-3 justify-between items-center">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVoiceToggle}
                    disabled={!voiceSupported}
                    className="gap-2 button-responsive-size !responsive-text-font-size px-4 py-2 md:px-5 md:py-2.5 lg:px-6 lg:py-3 xl:px-7 xl:py-3.5"
                  >
                    {listening ? <Square className="responsive-icon-font-size" /> : <Mic className="responsive-icon-font-size" />}
                    {listening ? t("tutor.voiceStop") : t("tutor.voiceStart")}
                  </Button>
                  {!voiceSupported && (
                    <span className="responsive-text-font-size text-muted-foreground">
                      {t("tutor.voiceNotSupported")}
                    </span>
                  )}
                </div>
                <Button 
                  onClick={handleSend} 
                  disabled={sending || streaming}
                  className="min-w-[120px] md:min-w-[140px] lg:min-w-[160px] !responsive-text-font-size button-responsive-size px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 xl:px-12 xl:py-6"
                >
                  {sending || streaming ? t("common.loading") : t("tutor.send")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


