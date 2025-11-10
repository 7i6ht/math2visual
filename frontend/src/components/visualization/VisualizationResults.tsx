import { Accordion } from "@/components/ui/accordion";
import { useState, useEffect, useCallback, memo } from "react";
import { VisualizationSection } from "./VisualizationSection";
import { MissingSVGSection } from "./MissingSVGSection";
import { ParseErrorSection } from "./ParseErrorSection";

interface VisualizationResultsProps {
  svgFormal: string | null;
  formalError: string | null;
  svgIntuitive: string | null;
  intuitiveError: string | null;
  missingSVGEntities?: string[];
  mwpValue?: string;
  formulaValue?: string;
  onRegenerateAfterUpload?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
  onEmbeddedSVGClick: (event: MouseEvent) => void;
  onEntityQuantityClick: (event: MouseEvent) => void;
  onNameClick: (event: MouseEvent) => void;
  isPopupOpen?: boolean;
  isDisabled?: boolean;
}

export const VisualizationResults = memo(({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
  missingSVGEntities = [],
  mwpValue = '',
  formulaValue = '',
  onRegenerateAfterUpload,
  onAllFilesUploaded,
  onEmbeddedSVGClick,
  onEntityQuantityClick,
  onNameClick,
  isPopupOpen = false,
  isDisabled = false,
}: VisualizationResultsProps) => {
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  // Suppress generic missing-SVG errors in the accordion; these are shown
  // more helpfully in the dedicated MissingSVGSection below
  const filterMissingSvgError = (error: string | null): string | null => {
    if (!error) return error;
    // Backend raises FileNotFoundError as: "SVG file not found: <path>"
    return /SVG file not found/i.test(error) ? null : error;
  };

  // Detect if this is a parse error by checking error message content
  const hasParseError = (formalError && /Visual Language parse error/i.test(formalError)) || 
                       (intuitiveError && /Visual Language parse error/i.test(intuitiveError));
    
  // Auto-expand error items when they're the only ones displayed
  const getDefaultAccordionItems = useCallback(() => {
    // Check for parse errors first
    if (hasParseError) return ["parse-error"];
    if (formalError && intuitiveError && missingSVGEntities.length > 0) return ["missing-svg"];
    return ["formal", "intuitive"];
  }, [hasParseError, formalError, intuitiveError, missingSVGEntities]);

  // Update accordion items when props change
  useEffect(() => {
    const defaultItems = getDefaultAccordionItems();
    setOpenAccordionItems(defaultItems);
  }, [getDefaultAccordionItems]);
  
  // Don't render if no content or errors at all
  if (!svgFormal && !formalError && !svgIntuitive && !intuitiveError && missingSVGEntities.length === 0) {
    return null;
  }

  return (
    <div className="h-full w-full">
      {/* Show parse error section when parse error exists */}
      {hasParseError && (
        <Accordion 
          type="multiple" 
          value={openAccordionItems}
          className="w-full space-y-2"
          onValueChange={setOpenAccordionItems}
        >
          <ParseErrorSection message="Could not parse Visual Language." />
        </Accordion>
      )}

      {/* Show missing SVG section if needed */}
      {missingSVGEntities.length > 0 && (
        <Accordion 
          type="multiple" 
          value={openAccordionItems}
          className="w-full space-y-2 mb-6"
          onValueChange={setOpenAccordionItems}
        >
          <MissingSVGSection
            missingSVGEntities={missingSVGEntities}
            onRegenerateAfterUpload={onRegenerateAfterUpload}
            onAllFilesUploaded={onAllFilesUploaded}
          />
        </Accordion>
      )}

      {/* Side-by-side visualization sections */}
      {!hasParseError && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 3xl:gap-16 4xl:gap-20 5xl:gap-24">
          <Accordion 
            type="multiple" 
            value={openAccordionItems}
            className="w-full"
            onValueChange={setOpenAccordionItems}
          >
            <VisualizationSection
              type="formal"
              title="Formal visual"
              svgContent={svgFormal}
              error={filterMissingSvgError(formalError)}
              isOpen={openAccordionItems.includes("formal")}
              mwpValue={mwpValue}
              formulaValue={formulaValue}
              onEmbeddedSVGClick={onEmbeddedSVGClick}
              onEntityQuantityClick={onEntityQuantityClick}
              onNameClick={onNameClick}
              isPopupOpen={isPopupOpen}
              isDisabled={isDisabled}
            />
          </Accordion>

          <Accordion 
            type="multiple" 
            value={openAccordionItems}
            className="w-full"
            onValueChange={setOpenAccordionItems}
          >
            <VisualizationSection
              type="intuitive"
              title="Intuitive visual"
              svgContent={svgIntuitive}
              error={filterMissingSvgError(intuitiveError)}
              isOpen={openAccordionItems.includes("intuitive")}
              mwpValue={mwpValue}
              formulaValue={formulaValue}
              onEmbeddedSVGClick={onEmbeddedSVGClick}
              onEntityQuantityClick={onEntityQuantityClick}
              onNameClick={onNameClick}
              isPopupOpen={isPopupOpen}
              isDisabled={isDisabled}
            />
          </Accordion>
        </div>
      )}
    </div>
  );
});
