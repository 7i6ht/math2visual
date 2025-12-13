import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTutorSession } from "@/hooks/useTutorSession";
import { useTutorSpeech } from "@/hooks/useTutorSpeech";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatMessages } from "./chat/ChatMessages";
import { ChatInputBar } from "./chat/ChatInputBar";

type Props = {
  onBack?: () => void;
};

export function ChatView({ onBack }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const {
    sessionId,
    messages,
    starting,
    streaming,
    isSessionActive,
    startSession,
    sendMessage,
    resetSession,
  } = useTutorSession({ 
    t
  });

  const {
    speechEnabled,
    speechSupported,
    speaking,
    speakingIndex,
    toggleSpeech,
    stopSpeech,
  } = useTutorSpeech({ t, messages });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { listening, voiceSupported, toggleVoice } = useVoiceInput({
    t,
    onTranscript: (transcript) =>
      setInput((prev) => (prev ? `${prev}\n${transcript}` : transcript)),
  });

  // Auto-start session with null MWP when component mounts
  useEffect(() => {
    if (!isSessionActive && !starting) {
      startSession(null);
    }
  }, [isSessionActive, starting, startSession]);

  // Interrupt tutor speech when student starts recording
  useEffect(() => {
    if (listening && speaking) {
      stopSpeech();
    }
  }, [listening, speaking, stopSpeech]);

  const handleSend = () => {
    if (!input.trim() || streaming || starting) {
      return;
    }

    if (!sessionId) {
      toast.error(t("tutor.sessionNotFound"));
      return;
    }

    // Interrupt tutor speech if speaking
    if (speaking) {
      stopSpeech();
    }

    const userMessage = input.trim();
    setInput("");
    sendMessage(userMessage);
  };

  const handleClose = useCallback(() => {
    // Reset session if active to clean up
    if (isSessionActive) {
      resetSession();
    }
    // Always redirect to landing page
    onBack?.();
  }, [isSessionActive, resetSession, onBack]);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col px-3 py-1 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 5xl:px-32">
      <ChatHeader
        onBack={handleClose}
        t={t}
        speechEnabled={speechEnabled}
        speechSupported={speechSupported}
        onToggleSpeech={toggleSpeech}
      />

      <div className="flex-1 overflow-hidden">
        <div className="grid gap-4 h-full">
          <div className="rounded-lg border bg-card pb-1 pl-1 pr-1 shadow-sm min-h-[320px] flex flex-col overflow-hidden h-full">
            <ChatMessages
              messages={messages}
              chatEndRef={chatEndRef}
              tutorSpeaking={speaking}
              tutorSpeakingIndex={speakingIndex}
            />

            <div className="flex-shrink-0">
              <ChatInputBar
                input={input}
                onInputChange={setInput}
                onSend={handleSend}
                onVoiceToggle={toggleVoice}
                voiceSupported={voiceSupported}
                listening={listening}
                streaming={streaming || starting}
                t={t}
                placeholder={t("tutor.sendPlaceholder")}
              />
              {!voiceSupported && (
                <div className="mt-2 responsive-text-font-size text-muted-foreground">
                  {t("tutor.voiceNotSupported")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


