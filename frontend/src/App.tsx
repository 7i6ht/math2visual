import './App.css';
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { SVGMissingError } from "@/components/errors/SVGMissingError";
import { GearLoading } from "@/components/ui/gear-loading";
import { Toaster } from "@/components/ui/sonner";
import { useAppState } from "@/hooks/usePageState";

function App() {
  const {
    vl,
    vlFormLoading,
    mpFormLoading,
    svgFormal,
    svgIntuitive,
    formalError,
    intuitiveError,
    missingSVGEntities,
    uploadGenerating,
    currentAbortFunction,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    resetVisuals,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
  } = useAppState();

  // Determine if any loading is happening and what message to show
  const isLoading = mpFormLoading || vlFormLoading || uploadGenerating;
  const loadingMessage = mpFormLoading ? "Generating..." : "Regenerating...";

  return (
    <>
      <div className="min-h-screen w-full p-8 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="/math2visual-logo.svg" 
              alt="Math2Visual Logo" 
              className="w-10 h-10"
            />
            <h1 className="text-4xl font-bold">Math2Visual</h1>
          </div>
          <p className="text-muted-foreground">Generating Pedagogically Meaningful Visuals for Math Word Problems</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <MathProblemForm 
            onSuccess={setResults}
            onLoadingChange={(loading, abortFn) => {
              setMpFormLoading(loading, abortFn);
            }}
            onReset={resetResults}
          />

          {vl && (
            <VisualLanguageForm
              vl={vl}
              onSuccess={setResults}
              onLoadingChange={(loading, abortFn) => {
                setVLFormLoading(loading, abortFn);
              }}
              onReset={resetVisuals}
            />
          )}

          {isLoading && (
            <div className="mt-8">
              <GearLoading 
                message={loadingMessage} 
                onAbort={currentAbortFunction || (() => {})}
                showAbortButton={true}
              />
            </div>
          )}
        </div>

        {(svgFormal || svgIntuitive  || ( missingSVGEntities.length === 0 && (formalError || intuitiveError))) && (
        <VisualizationResults
          svgFormal={svgFormal}
          formalError={formalError}
          svgIntuitive={svgIntuitive}
          intuitiveError={intuitiveError}
          />
        )}

        {missingSVGEntities.length > 0 && (
          <SVGMissingError
            missingSVGEntities={missingSVGEntities}
            onGenerate={handleRegenerateAfterUpload}
            onAllFilesUploaded={clearMissingSVGEntities}
          />
        )}
      </div>
      <Toaster/>
    </>
  );
}

export default App;