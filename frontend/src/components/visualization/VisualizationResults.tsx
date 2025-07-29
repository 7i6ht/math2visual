import { VisualizationCard } from "./VisualizationCard";
import { generateVisualizationFilename } from "@/utils/download";

interface VisualizationResultsProps {
  svgFormal: string | null;
  formalError: string | null;
  svgIntuitive: string | null;
  intuitiveError: string | null;
}

export const VisualizationResults = ({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
}: VisualizationResultsProps) => {
  // Only show the results container if there's something to display
  if (!svgFormal && !formalError && !svgIntuitive && !intuitiveError) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6 text-center">Generated Visualizations</h2>
      
      <div className="svg-row">
        <VisualizationCard
          svgContent={svgFormal}
          error={formalError}
          title="Formal Representation"
          filename={generateVisualizationFilename('formal')}
        />
        
        <VisualizationCard
          svgContent={svgIntuitive}
          error={intuitiveError}
          title="Intuitive Representation"
          filename={generateVisualizationFilename('intuitive')}
        />
      </div>
    </div>
  );
}; 