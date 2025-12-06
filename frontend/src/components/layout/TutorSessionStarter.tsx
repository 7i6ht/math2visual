import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FlyingChatbotIcon } from "@/components/ui/flying-chatbot-icon";

type TutorSessionStarterProps = {
  mwp: string;
  onMwpChange: (value: string) => void;
  onStart: () => void;
  starting: boolean;
};

export const TutorSessionStarter = ({
  mwp,
  onMwpChange,
  onStart,
  starting,
}: TutorSessionStarterProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 max-w-3xl">
      <label className="block responsive-text-font-size font-medium text-foreground">
        {t("tutor.enterMwpLabel")}
      </label>
      <Textarea
        value={mwp}
        onChange={(e) => onMwpChange(e.target.value)}
        placeholder={t("tutor.enterMwpPlaceholder")}
        spellCheck={false}
        className="min-h-[160px] responsive-text-font-size"
      />
      <div className="flex gap-3 items-center">
        <Button
          onClick={onStart}
          disabled={starting}
          className="min-w-[200px] !responsive-text-font-size button-responsive-size px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 xl:px-12 xl:py-6"
        >
          {starting ? t("common.loading") : t("tutor.startSession")}
        </Button>
        <FlyingChatbotIcon animated={starting} responsive minSize={34} maxSize={140} />
      </div>
    </div>
  );
};


