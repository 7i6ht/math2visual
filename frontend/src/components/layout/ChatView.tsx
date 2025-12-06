import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import tutorService from "@/api_services/tutor";
import type { TutorVisual } from "@/api_services/tutor";
import { Mic, Square, User, ArrowUp } from "lucide-react";
import { TextCancelButton } from "@/components/ui/text-cancel-button";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { FlyingChatbotIcon } from "@/components/ui/flying-chatbot-icon";
import { useSVGResponsive } from "@/hooks/useSVGResponsive";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TutorSessionStarter } from "./TutorSessionStarter";

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

const ChatVisual = ({ visual, title }: { visual: TutorVisual; title: string }) => {
  const svgRef = useRef<HTMLDivElement | null>(null);
  const { makeResponsive, setupResizeListener } = useSVGResponsive();

  useEffect(() => {
    if (!svgRef.current || !visual.svg) return;
    svgRef.current.innerHTML = visual.svg;
    makeResponsive(svgRef.current, { align: "left" });
  }, [visual, makeResponsive]);

  useEffect(() => {
    const cleanup = setupResizeListener([svgRef], { align: "left" });
    return () => {
      cleanup();
    };
  }, [setupResizeListener]);

  return (
    <div className="mt-3 rounded-lg border bg-card p-3 shadow-sm text-left">
      <div className="responsive-text-font-size font-semibold mb-2">{title}</div>
      <div className="w-full overflow-hidden rounded-md border bg-white">
        <div ref={svgRef} className="w-full" />
      </div>
      {visual.reason && (
        <p className="mt-2 responsive-text-font-size text-muted-foreground">{visual.reason}</p>
      )}
    </div>
  );
};

export function ChatView({ onBack }: Props) {
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
  const [mwpError, setMwpError] = useState<string | null>(null);
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
      setMwpError(t("forms.mwpRequired"));
      return;
    }
    setMwpError(null);
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
    <div className="w-full h-screen overflow-hidden flex flex-col px-3 py-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 5xl:px-32">
      <div className="flex items-center justify-between mb-1 sm:mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ResponsiveLogo className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 3xl:w-16 3xl:h-16 4xl:w-20 4xl:h-20 5xl:w-22 5xl:h-22" />
          <span className="responsive-title-simple font-bold">Math2Visual</span>
        </div>
        {onBack && (
          <TextCancelButton
            onClick={onBack}
            label={t("common.close")}
            ariaLabel={t("common.close")}
          />
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {!isSessionActive && (
          <TutorSessionStarter
            mwp={mwp}
            onMwpChange={(value) => {
              setMwp(value);
              if (mwpError && value.trim()) {
                setMwpError(null);
              }
            }}
            onStart={handleStart}
            starting={starting}
            errorText={mwpError}
          />
        )}

        {isSessionActive && (
          <div className="mt-4 grid gap-4 h-full">
            <div className="rounded-lg border bg-card p-4 shadow-sm min-h-[320px] flex flex-col overflow-hidden h-full">
              <div className="flex-1 space-y-4 overflow-y-auto px-1 sm:px-1.5 md:px-2 lg:px-3 xl:px-4 2xl:px-5 3xl:px-6 4xl:px-8 5xl:px-10">
                {messages.map((msg, idx) => {
                  const isStudent = msg.role === "student";
                  const alignment = isStudent ? "justify-end" : "justify-start";
                  const slide = isStudent ? "slide-in-from-right-4" : "slide-in-from-left-4";
                  const contentAlign = isStudent ? "items-end" : "items-start";
                  return (
                    <div key={idx} className={`w-full flex ${alignment} gap-2`}>
                      {!isStudent && (
                        <div className="flex items-start select-none">
                          <FlyingChatbotIcon
                            className="text-muted-foreground"
                            animated={Boolean(msg.streaming)}
                            responsive
                            minSize={26}
                            maxSize={120}
                          />
                        </div>
                      )}
                      <div className={`flex flex-col ${contentAlign} space-y-2 max-w-[85%]`}>
                        <div
                          className={`inline-block rounded-lg px-3 py-2 ${
                            isStudent
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          } animate-in fade-in-0 ${slide} duration-200`}
                        >
                          <div className="responsive-text-font-size whitespace-pre-wrap">
                            <span>{msg.content}</span>
                          </div>
                          {msg.streaming && (
                            <div className="flex items-center justify-start gap-1 mt-2">
                              <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                              <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                            </div>
                          )}
                        </div>
                        {msg.visual && (
                          <div className="w-full">
                            <ChatVisual
                              visual={msg.visual}
                              title={
                                msg.visual.variant === "formal"
                                  ? t("tutor.visualTitleFormal")
                                  : t("tutor.visualTitleIntuitive")
                              }
                            />
                          </div>
                        )}
                      </div>
                      {isStudent && (
                        <div className="flex items-start select-none">
                          <User className="responsive-icon-font-size text-primary" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-1 flex-shrink-0">
                <div className="relative rounded-md border bg-white shadow-sm">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("tutor.sendPlaceholder")}
                    spellCheck={false}
                    className="w-full responsive-text-font-size border-0 bg-transparent p-3 pr-32 sm:pr-40 lg:pr-48 xl:pr-56 shadow-none resize-none min-h-[44px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-0.5 sm:gap-0.5 md:gap-0.5 lg:gap-1 xl:gap-2 2xl:gap-4 3xl:gap-6 4xl:gap-8 5xl:gap-12 6xl:gap-14">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleVoiceToggle}
                      disabled={!voiceSupported}
                      className="h-11 w-11 sm:h-12 sm:w-12 lg:h-13 lg:w-13 xl:h-15 xl:w-15 p-0 flex items-center justify-center rounded-full"
                      aria-label={listening ? t("tutor.voiceStop") : t("tutor.voiceStart")}
                    >
                      {listening ? (
                        <Square className="responsive-icon-font-size" />
                      ) : (
                        <Mic className="responsive-icon-font-size" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSend}
                      disabled={sending || streaming}
                      className="p-0 flex items-center justify-center rounded-full bg-black text-white hover:bg-black/90 hover:text-white shadow-sm"
                      style={{
                        width: "clamp(48px, 2.6vw, 88px)",
                        height: "clamp(48px, 2.6vw, 88px)",
                      }}
                      aria-label={t("tutor.send")}
                    >
                      <ArrowUp className="responsive-icon-font-size" />
                    </Button>
                  </div>
                </div>
                {!voiceSupported && (
                  <div className="mt-2 responsive-text-font-size text-muted-foreground">
                    {t("tutor.voiceNotSupported")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


