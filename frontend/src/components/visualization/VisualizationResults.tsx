
import { Accordion } from "@/components/ui/accordion";
import { useState } from "react";
import { ComponentEditPanel } from "@/components/editing/ComponentEditPanel";
import { useEditableComponents } from "@/hooks/useEditableComponents";
import { VisualizationSection } from "./VisualizationSection";
import { MissingSVGSection } from "./MissingSVGSection";

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
}: VisualizationResultsProps) => {
  const [activeVisualizationType, setActiveVisualizationType] = useState<'formal' | 'intuitive'>('formal');
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(["formal"]);
  
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

  // Don't render if no content
  if (!svgFormal && !formalError && !svgIntuitive && !intuitiveError && missingSVGEntities.length === 0) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <h2 className="text-xl font-semibold mb-4 text-center">Generated Visualizations</h2>
      
      <Accordion 
        type="multiple" 
        defaultValue={["formal"]} 
        className="w-full space-y-2"
        onValueChange={setOpenAccordionItems}
      >
        <VisualizationSection
          type="formal"
          title="Formal Representation"
          svgContent={svgFormal}
          error={formalError}
          componentMappings={componentMappings?.formal || {}}
          isOpen={openAccordionItems.includes("formal")}
          mwpValue={mwpValue}
          onDSLRangeHighlight={onDSLRangeHighlight}
          onMWPRangeHighlight={onMWPRangeHighlight}
          onComponentClick={openEditPanel}
          onHover={() => handleVisualizationHover('formal')}
        />

        <VisualizationSection
          type="intuitive"
          title="Intuitive Representation"
          svgContent={svgIntuitive}
          error={intuitiveError}
          componentMappings={componentMappings?.intuitive || {}}
          isOpen={openAccordionItems.includes("intuitive")}
          mwpValue={mwpValue}
          onDSLRangeHighlight={onDSLRangeHighlight}
          onMWPRangeHighlight={onMWPRangeHighlight}
          onComponentClick={openEditPanel}
          onHover={() => handleVisualizationHover('intuitive')}
        />

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