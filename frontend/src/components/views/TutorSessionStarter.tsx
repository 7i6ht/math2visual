import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FlyingChatbotIcon } from "@/components/ui/flying-chatbot-icon";
import { HeroShell } from "./hero/HeroShell";

type TutorSessionStarterProps = {
  mwp: string;
  onMwpChange: (value: string) => void;
  onStart: () => void;
  starting: boolean;
  errorText?: string | null;
};

export const TutorSessionStarter = ({
  mwp,
  onMwpChange,
  onStart,
  starting,
  errorText,
}: TutorSessionStarterProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 overflow-auto bg-background">
      <HeroShell title="Math2Visual" subtitle={t("app.subtitle")}>
        <div className="space-y-6">
          <div className="space-y-3">
            <Textarea
              value={mwp}
              onChange={(e) => onMwpChange(e.target.value)}
              placeholder={t("tutor.enterMwpPlaceholder")}
              spellCheck={false}
              className="w-full responsive-text-font-size"
              rows={5}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onStart();
                }
              }}
            />
            {errorText && (
              <p className="text-destructive mt-1 responsive-text-font-size">{errorText}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-5 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 2xl:gap-14 3xl:gap-16 4xl:gap-20 5xl:gap-24 6xl:gap-28">
            <Button
              onClick={onStart}
              disabled={starting}
              className="min-w-[200px] !responsive-text-font-size button-responsive-size px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 xl:px-12 xl:py-6"
            >
              {t("tutor.startSession")}
            </Button>

            <FlyingChatbotIcon animated={starting} responsive minSize={34} maxSize={140} />
          </div>
        </div>
      </HeroShell>
    </div>
  );
};


