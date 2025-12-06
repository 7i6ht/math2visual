import type { TFunction } from "i18next";
import { Mic, Square, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatInputBarProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  voiceSupported: boolean;
  listening: boolean;
  sending: boolean;
  streaming: boolean;
  t: TFunction;
};

export const ChatInputBar = ({
  input,
  onInputChange,
  onSend,
  onVoiceToggle,
  voiceSupported,
  listening,
  sending,
  streaming,
  t,
}: ChatInputBarProps) => {
  return (
    <div className="relative rounded-md border bg-white shadow-sm">
      <Textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={t("tutor.sendPlaceholder")}
        spellCheck={false}
        rows={1}
        className="w-full responsive-text-font-size border-0 bg-transparent p-3 pr-32 sm:pr-40 lg:pr-48 xl:pr-56 shadow-none resize-none !min-h-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <div className="absolute bottom-2 right-3 sm:right-4 md:right-5 flex items-center gap-0.5 sm:gap-0.5 md:gap-0.5 lg:gap-1 xl:gap-2 2xl:gap-4 3xl:gap-6 4xl:gap-8 5xl:gap-12 6xl:gap-14">
        <Button
          type="button"
          variant="ghost"
          onClick={onVoiceToggle}
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
          onClick={onSend}
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
  );
};

