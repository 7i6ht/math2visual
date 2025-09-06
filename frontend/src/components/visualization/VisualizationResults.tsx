
import { Accordion } from "@/components/ui/accordion";
import { useState, useEffect } from "react";
import { ComponentEditPanel } from "@/components/editing/ComponentEditPanel";
import { useEditableComponents } from "@/hooks/useEditableComponents";
import { VisualizationSection } from "./VisualizationSection";
import { MissingSVGSection } from "./MissingSVGSection";
import { ParseErrorSection } from "./ParseErrorSection";

interface VisualizationResultsProps {
  svgFormal: string | null;
  formalError: string | null;
  svgIntuitive: string | null;
  intuitiveError: string | null;
  missingSVGEntities?: string[];
  componentMappings?: {
    formal: Record<string, {
      dsl_range: [number, number];
      property_value?: string;
    }>;
    intuitive: Record<string, {
      dsl_range: [number, number];
      property_value?: string;
    }>;
  };
  dslValue?: string;
  mwpValue?: string;
  onDSLRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onMWPRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onComponentUpdate?: (dsl: string, mwp: string) => void;
  onRegenerateAfterUpload?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
  currentDSLPath?: string | null;
}

export const VisualizationResults = ({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
  missingSVGEntities = [],
  componentMappings,
  dslValue = '',
  mwpValue = '',
  onDSLRangeHighlight,
  onMWPRangeHighlight,
  onComponentUpdate,
  onRegenerateAfterUpload,
  onAllFilesUploaded,
  currentDSLPath,
}: VisualizationResultsProps) => {
  const [activeVisualizationType, setActiveVisualizationType] = useState<'formal' | 'intuitive'>('formal');
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  
  // Auto-expand error items when they're the only ones displayed
  const getDefaultAccordionItems = () => {
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
  };

  // Update accordion items when props change
  useEffect(() => {
    const defaultItems = getDefaultAccordionItems();
    setOpenAccordionItems(defaultItems);
  }, [formalError, intuitiveError, missingSVGEntities]);
  
  // Suppress generic missing-SVG errors in the accordion; these are shown
  // more helpfully in the dedicated MissingSVGSection below
  const filterMissingSvgError = (error: string | null): string | null => {
    if (!error) return error;
    // Backend raises FileNotFoundError as: "SVG file not found: <path>"
    return /SVG file not found/i.test(error) ? null : error;
  };

  // Setup editable components
  const {
    editingComponent,
    editPosition,
    componentProperties,
    handleComponentUpdate,
    openEditPanel,
    closeEditPanel
  } = useEditableComponents({
    initialDSL: dslValue,
    initialMWP: mwpValue,
    componentMappings: activeVisualizationType === 'formal' 
      ? (componentMappings?.formal || {})
      : (componentMappings?.intuitive || {}),
    onUpdate: onComponentUpdate || (() => {}),
  });

  const handleVisualizationHover = (type: 'formal' | 'intuitive') => {
    setActiveVisualizationType(type);
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
      <h2 className="text-xl font-semibold mb-4 text-center">Generated Visualizations</h2>
      
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
              title="Formal Representation"
              svgContent={svgFormal}
              error={filterMissingSvgError(formalError)}
              componentMappings={componentMappings?.formal || {}}
              isOpen={openAccordionItems.includes("formal")}
              mwpValue={mwpValue}
              onDSLRangeHighlight={onDSLRangeHighlight}
              onMWPRangeHighlight={onMWPRangeHighlight}
              onComponentClick={openEditPanel}
              onHover={() => handleVisualizationHover('formal')}
              currentDSLPath={currentDSLPath}
            />

            <VisualizationSection
              type="intuitive"
              title="Intuitive Representation"
              svgContent={svgIntuitive}
              error={filterMissingSvgError(intuitiveError)}
              componentMappings={componentMappings?.intuitive || {}}
              isOpen={openAccordionItems.includes("intuitive")}
              mwpValue={mwpValue}
              onDSLRangeHighlight={onDSLRangeHighlight}
              onMWPRangeHighlight={onMWPRangeHighlight}
              onComponentClick={openEditPanel}
              onHover={() => handleVisualizationHover('intuitive')}
              currentDSLPath={currentDSLPath}
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
      
      {/* Edit Panel */}
      {editingComponent && componentProperties && (
        <ComponentEditPanel
          dslPath={editingComponent}
          properties={componentProperties}
          position={editPosition}
          onUpdate={handleComponentUpdate}
          onClose={closeEditPanel}
        />
      )}
    </div>
  );
}; 