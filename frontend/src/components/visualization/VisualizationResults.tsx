import { Accordion } from "@/components/ui/accordion";
import { useState, useEffect, useCallback } from "react";
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
  onRegenerateAfterUpload?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
  onEmbeddedSVGClick: (dslPath: string, event: MouseEvent) => void;
  onEntityQuantityClick: (dslPath: string, event: MouseEvent) => void;
  isSelectorOpen?: boolean;
}

export const VisualizationResults = ({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
  missingSVGEntities = [],
  mwpValue = '',
  onRegenerateAfterUpload,
  onAllFilesUploaded,
  onEmbeddedSVGClick,
  onEntityQuantityClick,
  isSelectorOpen = false,
}: VisualizationResultsProps) => {

  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
    
  // Auto-expand error items when they're the only ones displayed
  const getDefaultAccordionItems = useCallback(() => {
    // Check for parse errors first
    if (formalError && /DSL parse error/i.test(formalError)) {
      return ["parse-error"];
    }
    if (intuitiveError && /DSL parse error/i.test(intuitiveError)) {
      return ["parse-error"];
    }
    // Check for missing SVG entities
    if (missingSVGEntities.length > 0) {
      return ["missing-svg"];
    }
    // Default to formal visualization
    return ["formal"];
  }, [formalError, intuitiveError, missingSVGEntities]);

  // Update accordion items when props change
  useEffect(() => {
    const defaultItems = getDefaultAccordionItems();
    setOpenAccordionItems(defaultItems);
  }, [getDefaultAccordionItems]);
  
  // Suppress generic missing-SVG errors in the accordion; these are shown
  // more helpfully in the dedicated MissingSVGSection below
  const filterMissingSvgError = (error: string | null): string | null => {
    if (!error) return error;
    // Backend raises FileNotFoundError as: "SVG file not found: <path>"
    return /SVG file not found/i.test(error) ? null : error;
  };

  // Detect if this is a parse error by checking error message content
  const hasParseError = (formalError && /DSL parse error/i.test(formalError)) || 
                       (intuitiveError && /DSL parse error/i.test(intuitiveError));

  // Don't render if no content or errors at all
  if (!svgFormal && !formalError && !svgIntuitive && !intuitiveError && missingSVGEntities.length === 0) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <h2 className="text-xl font-semibold mb-4 text-center">Visuals</h2>
      
      <Accordion 
        type="multiple" 
        value={openAccordionItems}
        className="w-full space-y-2"
        onValueChange={setOpenAccordionItems}
      >
        {/* Show parse error section when parse error exists */}
        {hasParseError && (
          <ParseErrorSection message="Could not parse Visual Language." />
        )}

        {/* Hide visualization sections entirely if SVG entities are missing or parse error exists */}
        {!hasParseError && missingSVGEntities.length === 0 && (
          <>
            <VisualizationSection
              type="formal"
              title="Formal"
              svgContent={svgFormal}
              error={filterMissingSvgError(formalError)}
              isOpen={openAccordionItems.includes("formal")}
              mwpValue={mwpValue}
              onEmbeddedSVGClick={onEmbeddedSVGClick}
              onEntityQuantityClick={onEntityQuantityClick}
              isSelectorOpen={isSelectorOpen}
            />

            <VisualizationSection
              type="intuitive"
              title="Intuitive"
              svgContent={svgIntuitive}
              error={filterMissingSvgError(intuitiveError)}
              isOpen={openAccordionItems.includes("intuitive")}
              mwpValue={mwpValue}
              onEmbeddedSVGClick={onEmbeddedSVGClick}
              onEntityQuantityClick={onEntityQuantityClick}
              isSelectorOpen={isSelectorOpen}
            />
          </>
        )}

        {missingSVGEntities.length > 0 && (
          <MissingSVGSection
            missingSVGEntities={missingSVGEntities}
            onRegenerateAfterUpload={onRegenerateAfterUpload}
            onAllFilesUploaded={onAllFilesUploaded}
          />
        )}
      </Accordion>
    </div>
  );
};
