// Missing SVG error section component
import { AlertCircle } from "lucide-react";
import { SVGMissingError } from "@/components/errors/SVGMissingError";
import { useTranslation } from "react-i18next";

interface MissingSVGSectionProps {
  missingSVGEntities: string[];
  onRegenerateAfterUpload?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
}

export const MissingSVGSection = ({
  missingSVGEntities,
  onRegenerateAfterUpload,
  onAllFilesUploaded,
}: MissingSVGSectionProps) => {
  const { t } = useTranslation();
  return (
    <div className="w-full space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertCircle className="responsive-icon-font-size text-destructive" />
        <h3 className="font-semibold text-destructive responsive-text-font-size">{t("svg.missingFileTitle")}</h3>
      </div>
      <SVGMissingError
        missingSVGEntities={missingSVGEntities}
        onGenerate={onRegenerateAfterUpload}
        onAllFilesUploaded={onAllFilesUploaded}
      />
    </div>
  );
};
