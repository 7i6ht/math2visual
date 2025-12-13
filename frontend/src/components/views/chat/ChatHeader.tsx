import { memo } from "react";
import type { TFunction } from "i18next";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextCancelButton } from "@/components/ui/text-cancel-button";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { LanguageSelector } from "@/components/ui/language-selector";

type ChatHeaderProps = {
  onBack?: () => void;
  t: TFunction;
  speechEnabled: boolean;
  speechSupported: boolean;
  onToggleSpeech: () => void;
};

export const ChatHeader = memo(({
  onBack,
  t,
  speechEnabled,
  speechSupported,
  onToggleSpeech,
}: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-1 sm:mb-2 flex-shrink-0">
      <div className="flex items-center gap-2">
        <ResponsiveLogo className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 3xl:w-16 3xl:h-16 4xl:w-20 4xl:h-20 5xl:w-22 5xl:h-22" />
        <span className="responsive-title-simple font-bold">Math2Visual</span>
      </div>
      {onBack && (
        <div className="flex items-center gap-1 sm:gap-2 xl:gap-3 2xl:gap-4 3xl:gap-6 4xl:gap-7 5xl:gap-8 6xl:gap-10">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleSpeech}
            aria-pressed={speechEnabled}
            aria-label={
              speechSupported
                ? speechEnabled
                  ? t("tutor.speechOn")
                  : t("tutor.speechOff")
                : t("tutor.speechNotSupported")
            }
            title={
              speechSupported
                ? speechEnabled
                  ? t("tutor.speechOn")
                  : t("tutor.speechOff")
                : t("tutor.speechNotSupported")
            }
            aria-disabled={!speechSupported}
            className="text-muted-foreground hover:text-foreground h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11 xl:h-12 xl:w-12 2xl:h-14 2xl:w-14 3xl:h-16 3xl:w-16 4xl:h-18 4xl:w-18 5xl:h-20 5xl:w-20 6xl:h-24 6xl:w-24"
          >
            {speechEnabled ? (
              <Volume2 className="responsive-icon-font-size" />
            ) : (
              <VolumeX className="responsive-icon-font-size" />
            )}
          </Button>
          <LanguageSelector />
          <TextCancelButton
            onClick={onBack}
            label={t("common.close")}
            ariaLabel={t("common.close")}
          />
        </div>
      )}
    </div>
  );
});

ChatHeader.displayName = "ChatHeader";

