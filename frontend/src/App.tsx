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
      <div className="w-full p-6 max-w-full mx-auto">
        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[calc(100vh-200px)] items-start">
          {/* Left Panel - Title / Input Forms */}
          <div className="flex flex-col space-y-6 sticky top-6 h-[calc(100vh-3rem)]">
             {/* Two-column input layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
              {/* Math Problem Input Column */}
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <img 
                      src="/math2visual-logo.svg" 
                      alt="Math2Visual Logo" 
                      className="w-8 h-8"
                    />
                    <h1 className="text-3xl font-bold">Math2Visual</h1>
                  </div>
                  <p className="text-muted-foreground text-sm">Generating Pedagogically Meaningful Visuals for Math Word Problems</p>
                </div>
                
                <MathProblemForm 
                  onSuccess={setResults}
                  onLoadingChange={(loading, abortFn) => {
                    setMpFormLoading(loading, abortFn);
                  }}
                  onReset={resetResults}
                />
              </div>

              {/* Visual Language Column */}
              <div className="flex flex-col min-h-0">
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
              </div>
            </div>

            {isLoading && (
              <div className="flex-shrink-0">
                <GearLoading 
                  message={loadingMessage} 
                  onAbort={currentAbortFunction || (() => {})}
                  showAbortButton={true}
                />
              </div>
            )}

            {missingSVGEntities.length > 0 && (
              <div className="flex-shrink-0">
                <SVGMissingError
                  missingSVGEntities={missingSVGEntities}
                  onGenerate={handleRegenerateAfterUpload}
                  onAllFilesUploaded={clearMissingSVGEntities}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Visualizations */}
          <div className="flex flex-col w-full">
            {(svgFormal || svgIntuitive || (missingSVGEntities.length === 0 && (formalError || intuitiveError))) && (
              <VisualizationResults
                svgFormal={svgFormal}
                formalError={formalError}
                svgIntuitive={svgIntuitive}
                intuitiveError={intuitiveError}
              />
            )}
          </div>
        </div>
      </div>
      <Toaster/>
    </>
  );
}

export default App;