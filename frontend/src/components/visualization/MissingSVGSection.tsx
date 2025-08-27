// Missing SVG error section component
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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
    <AccordionItem value="missing-svg" className="border rounded-lg !border-b bg-destructive/5 border-destructive/20">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="font-normal text-destructive">Missing SVG File</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <SVGMissingError
          missingSVGEntities={missingSVGEntities}
          onGenerate={onRegenerateAfterUpload}
          onAllFilesUploaded={onAllFilesUploaded}
        />
      </AccordionContent>
    </AccordionItem>
  );
};
