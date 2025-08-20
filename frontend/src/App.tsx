import './App.css';
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";

import { GearLoading } from "@/components/ui/gear-loading";
import { Toaster } from "@/components/ui/sonner";
import { useAppState } from "@/hooks/useAppState";

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
    hasCompletedGeneration,
    initialMWP,
    initialFormula,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    resetVisuals,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    saveInitialValues,
  } = useAppState();

  // Determine if any loading is happening and what message to show
  const isLoading = mpFormLoading || vlFormLoading || uploadGenerating;
  const loadingMessage = mpFormLoading ? "Generating..." : "Regenerating...";
  

  return (
    <>
      <div className="w-full p-6 max-w-full mx-auto">
        {!hasCompletedGeneration ? (
          /* Centered layout (initial state and during loading) */
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
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
            
            {/* Centered Math Problem Form */}
            <div className="w-full max-w-2xl">
              <MathProblemForm 
                onSuccess={setResults}
                onLoadingChange={(loading, abortFn) => {
                  setMpFormLoading(loading, abortFn);
                }}
                onReset={resetResults}
                initialMwp={initialMWP}
                initialFormula={initialFormula}
                saveInitialValues={saveInitialValues}
                rows={4}
              />
            </div>

            <div className={`mt-6 ${isLoading ? "" : "invisible"}`}>
              <GearLoading 
                message={loadingMessage} 
                onAbort={handleAbort}
                showAbortButton={true}
              />
            </div>
          </div>
        ) : (
          /* Two-column layout after generation completes */
          isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] max-w-4xl mx-auto">
              <GearLoading 
                message={loadingMessage} 
                onAbort={handleAbort}
                showAbortButton={true}
                size="large"
              />
            </div>
          ) : (
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
                      initialMwp={initialMWP}
                      initialFormula={initialFormula}
                      saveInitialValues={saveInitialValues}
                      rows={8}
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


              </div>

              {/* Right Panel - Visualizations */}
              <div className="flex flex-col w-full">
                <VisualizationResults
                  svgFormal={svgFormal}
                  formalError={formalError}
                  svgIntuitive={svgIntuitive}
                  intuitiveError={intuitiveError}
                  missingSVGEntities={missingSVGEntities}
                  onRegenerateAfterUpload={handleRegenerateAfterUpload}
                  onAllFilesUploaded={clearMissingSVGEntities}
                />
              </div>
            </div>
          )
        )}
      </div>
      <Toaster/>
    </>
  );
}

export default App;