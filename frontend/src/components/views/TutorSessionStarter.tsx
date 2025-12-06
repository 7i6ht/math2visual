import { useTranslation } from "react-i18next";
import { FlyingChatbotIcon } from "@/components/ui/flying-chatbot-icon";
import { MwpPromptView } from "@/components/common/MwpPromptView";

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
    <MwpPromptView
      mwp={mwp}
      onMwpChange={onMwpChange}
      onSubmit={onStart}
      submitLabel={t("tutor.startSession")}
      loading={starting}
      errorText={errorText}
      placeholder={t("tutor.enterMwpPlaceholder")}
      footerContent={<FlyingChatbotIcon animated={starting} responsive minSize={34} maxSize={140} />}
      fullScreen
    />
  );
};


