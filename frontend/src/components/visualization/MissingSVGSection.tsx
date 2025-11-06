// Missing SVG error section component
import { AlertCircle } from "lucide-react";
import { SVGMissingError } from "@/components/errors/SVGMissingError";

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
  return (
    <div className="w-full space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertCircle className="responsive-icon-font-size text-destructive" />
        <h3 className="font-semibold text-destructive responsive-text-font-size">Missing SVG File</h3>
      </div>
      <SVGMissingError
        missingSVGEntities={missingSVGEntities}
        onGenerate={onRegenerateAfterUpload}
        onAllFilesUploaded={onAllFilesUploaded}
      />
    </div>
  );
};
