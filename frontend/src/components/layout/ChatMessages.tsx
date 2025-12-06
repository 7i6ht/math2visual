import type { RefObject } from "react";
import { User } from "lucide-react";
import type { TFunction } from "i18next";
import { FlyingChatbotIcon } from "@/components/ui/flying-chatbot-icon";
import { ChatVisual } from "./ChatVisual";
import type { Message } from "@/hooks/useTutorSession";

type ChatMessagesProps = {
  messages: Message[];
  t: TFunction;
  chatEndRef: RefObject<HTMLDivElement | null>;
};

export const ChatMessages = ({ messages, t, chatEndRef }: ChatMessagesProps) => {
  return (
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
                  isStudent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                } animate-in fade-in-0 ${slide} duration-200`}
              >
                <div className="responsive-text-font-size whitespace-pre-wrap">
                  <span>{msg.content}</span>
                </div>
                {msg.streaming && (
                  <div className="flex items-center justify-start gap-1 mt-2">
                    <span
                      className="h-2 w-2 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: "240ms" }}
                    />
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
  );
};

