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
  formulaValue?: string;
  onRegenerateAfterUpload?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
  onEmbeddedSVGClick: (event: MouseEvent) => void;
  onEntityQuantityClick: (event: MouseEvent) => void;
  onNameClick: (event: MouseEvent) => void;
  isPopupOpen?: boolean;
  isDisabled?: boolean;
  onShowHint: () => void;
}

export const VisualizationResults = ({
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
  onShowHint,
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
  const hasParseError = (formalError && /DSL parse error/i.test(formalError)) || 
                       (intuitiveError && /DSL parse error/i.test(intuitiveError));
    
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
        {!hasParseError && (
          <>
            <VisualizationSection
              type="formal"
              title="Formal"
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

            <VisualizationSection
              type="intuitive"
              title="Intuitive"
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
      
      {/* Teacher feedback loop trigger */}
      {(svgFormal || svgIntuitive) && (
        <div className="mt-4 text-left">
          <button
            onClick={onShowHint}
            className="text-red-500 cursor-pointer text-sm group"
          >
            Does not look as expected? <span className="group-hover:text-red-700 group-hover:italic">🡒 Add more hints ...</span>
          </button>
        </div>
      )}
    </div>
  );
};
