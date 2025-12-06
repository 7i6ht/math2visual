import type { TFunction } from "i18next";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextCancelButton } from "@/components/ui/text-cancel-button";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";

type ChatHeaderProps = {
  onBack?: () => void;
  t: TFunction;
  speechEnabled: boolean;
  speechSupported: boolean;
  onToggleSpeech: () => void;
};

export const ChatHeader = ({
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
        <div className="flex items-center gap-1 sm:gap-2">
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
            className="text-muted-foreground hover:text-foreground"
          >
            {speechEnabled ? (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </Button>
          <TextCancelButton
            onClick={onBack}
            label={t("common.close")}
            ariaLabel={t("common.close")}
          />
        </div>
      )}
    </div>
  );
};

