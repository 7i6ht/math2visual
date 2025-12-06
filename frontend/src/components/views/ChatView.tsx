import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTutorSession } from "@/hooks/useTutorSession";
import { useTutorSpeech } from "@/hooks/useTutorSpeech";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { TutorSessionStarter } from "./TutorSessionStarter";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatMessages } from "./chat/ChatMessages";
import { ChatInputBar } from "./chat/ChatInputBar";

type Props = {
  onBack?: () => void;
};

export function ChatView({ onBack }: Props) {
  const { t } = useTranslation();
  const [mwp, setMwp] = useState("");
  const [input, setInput] = useState("");
  const [mwpError, setMwpError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const {
    sessionId,
    messages,
    starting,
    sending,
    streaming,
    isSessionActive,
    startSession,
    sendMessage,
  } = useTutorSession({ t });
  const {
    speechEnabled,
    speechSupported,
    speaking,
    speakingIndex,
    toggleSpeech,
  } = useTutorSpeech({ t, messages });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { listening, voiceSupported, toggleVoice } = useVoiceInput({
    t,
    onTranscript: (transcript) =>
      setInput((prev) => (prev ? `${prev}\n${transcript}` : transcript)),
  });

  const handleStart = async () => {
    if (!mwp.trim()) {
      setMwpError(t("forms.mwpRequired"));
      return;
    }
    setMwpError(null);
    const started = await startSession(mwp.trim());
    if (started) {
      setInput("");
    }
  };

  const handleSend = () => {
    if (!sessionId) {
      toast.error(t("tutor.sessionNotFound"));
      return;
    }
    if (!input.trim() || streaming) {
      return;
    }

    const userMessage = input.trim();
    setInput("");
    sendMessage(userMessage);
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col px-3 py-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 5xl:px-32">
      <ChatHeader
        onBack={onBack}
        t={t}
        speechEnabled={speechEnabled}
        speechSupported={speechSupported}
        onToggleSpeech={toggleSpeech}
      />

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
                  <ChatMessages
                    messages={messages}
                    t={t}
                    chatEndRef={chatEndRef}
                    tutorSpeaking={speaking}
                    tutorSpeakingIndex={speakingIndex}
                  />

              <div className="mt-1 flex-shrink-0">
                <ChatInputBar
                  input={input}
                  onInputChange={setInput}
                  onSend={handleSend}
                  onVoiceToggle={toggleVoice}
                  voiceSupported={voiceSupported}
                  listening={listening}
                  sending={sending}
                  streaming={streaming}
                  t={t}
                />
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


