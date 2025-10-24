// Missing SVG error section component
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AlertCircle } from "lucide-react";
import { SVGMissingError } from "@/components/errors/SVGMissingError";
import { useAnalytics } from "@/hooks/useAnalytics";

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
  const { trackElementClick, isAnalyticsEnabled } = useAnalytics();
  return (
    <AccordionItem value="missing-svg" className="border rounded-lg !border-b bg-destructive/5 border-destructive/20">
      <AccordionTrigger 
        className="px-4 hover:no-underline"
        {...(isAnalyticsEnabled ? {onClick: () => {
          trackElementClick('accordion_missing-svg_click', 'accordion', 'missing-svg');

        }} : {})}
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="responsive-icon-font-size text-destructive" />
          <span className="font-normal text-destructive responsive-text-font-size">Missing SVG File</span>
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
