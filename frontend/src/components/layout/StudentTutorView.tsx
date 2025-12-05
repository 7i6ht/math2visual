import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import tutorService from "@/api_services/tutor";
import type { TutorVisual } from "@/api_services/tutor";

type Message = {
  role: "student" | "tutor";
  content: string;
  visual?: TutorVisual | null;
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

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const isSessionActive = useMemo(() => !!sessionId, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const appendTutorResponse = (content: string, visual?: TutorVisual | null) => {
    appendMessage({ role: "tutor", content, visual });
    if (visual?.error) {
      toast.error(visual.error);
    }
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
    if (!input.trim()) {
      return;
    }
    try {
      setSending(true);
      const userMessage = input.trim();
      appendMessage({ role: "student", content: userMessage });
      setInput("");
      const response = await tutorService.sendMessage(sessionId, userMessage);
      appendTutorResponse(response.tutor_message, response.visual);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.unexpectedError");
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const renderVisual = (visual?: TutorVisual | null) => {
    if (!visual || !visual.svg) return null;
    const title =
      visual.variant === "formal"
        ? t("tutor.visualTitleFormal")
        : t("tutor.visualTitleIntuitive");
    return (
      <div className="mt-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="text-sm font-semibold mb-2">{title}</div>
        <div
          className="w-full overflow-hidden rounded-md border bg-white"
          dangerouslySetInnerHTML={{ __html: visual.svg }}
        />
        {visual.reason && (
          <p className="mt-2 text-sm text-muted-foreground">{visual.reason}</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full px-3 py-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 5xl:px-32">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold">{t("landing.student")}</h2>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            {t("common.close")}
          </Button>
        )}
      </div>

      {!isSessionActive && (
        <div className="space-y-3 max-w-3xl">
          <label className="block text-sm font-medium text-foreground">
            {t("tutor.enterMwpLabel")}
          </label>
          <Textarea
            value={mwp}
            onChange={(e) => setMwp(e.target.value)}
            placeholder={t("tutor.enterMwpPlaceholder")}
            className="min-h-[160px] responsive-text-font-size"
          />
          <div className="flex gap-3">
            <Button onClick={handleStart} disabled={starting}>
              {starting ? t("common.loading") : t("tutor.startSession")}
            </Button>
          </div>
        </div>
      )}

      {isSessionActive && (
        <div className="mt-4 grid gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm min-h-[320px] flex flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  <div
                    className={`inline-block rounded-lg px-3 py-2 ${
                      msg.role === "student"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="responsive-text-font-size whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                  {renderVisual(msg.visual)}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-4 space-y-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("tutor.sendPlaceholder")}
                className="responsive-text-font-size"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex gap-3 justify-end">
                <Button onClick={handleSend} disabled={sending}>
                  {sending ? t("common.loading") : t("tutor.send")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


