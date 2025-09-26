import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { GearLoading } from "@/components/ui/gear-loading";

type Props = {
  svgFormal: string | null;
  formalError: string | null;
  svgIntuitive: string | null;
  intuitiveError: string | null;
  missingSVGEntities: string[];
  mwp: string;
  onRegenerateAfterUpload: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded: () => void;
  onEmbeddedSVGClick: (dslPath: string, event: MouseEvent) => void;
  onEntityQuantityClick: (dslPath: string, event: MouseEvent) => void;
  onContainerNameClick: (dslPath: string, event: MouseEvent) => void;
  isSelectorOpen: boolean;
  vlFormLoading: boolean;
  uploadGenerating: boolean;
  handleAbort: () => void;
};

export function RightPanel({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
  missingSVGEntities,
  mwp,
  onRegenerateAfterUpload,
  onAllFilesUploaded,
  onEmbeddedSVGClick,
  onEntityQuantityClick,
  onContainerNameClick,
  isSelectorOpen,
  vlFormLoading,
  uploadGenerating,
  handleAbort,
}: Props) {
  return (
    <div className="flex flex-col w-full">
      <VisualizationResults
        svgFormal={svgFormal}
        formalError={formalError}
        svgIntuitive={svgIntuitive}
        intuitiveError={intuitiveError}
        missingSVGEntities={missingSVGEntities}
        mwpValue={mwp}
        onRegenerateAfterUpload={onRegenerateAfterUpload}
        onAllFilesUploaded={onAllFilesUploaded}
        onEmbeddedSVGClick={onEmbeddedSVGClick}
        onEntityQuantityClick={onEntityQuantityClick}
        onContainerNameClick={onContainerNameClick}
        isSelectorOpen={isSelectorOpen}
      />

      {(vlFormLoading || uploadGenerating) && (
        <div className="mt-8 animate-in fade-in-0 duration-300">
          <GearLoading
            message="Regenerating..."
            onAbort={handleAbort}
            showAbortButton={true}
            size="small"
          />
        </div>
      )}
    </div>
  );
}


