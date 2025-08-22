import './App.css';
import { useState } from 'react';
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
    componentMappings,
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
  
  // State for highlighting
  const [dslHighlightRanges, setDslHighlightRanges] = useState<Array<[number, number]>>([]);
  const [mwpHighlightRanges, setMwpHighlightRanges] = useState<Array<[number, number]>>([]);

  // Determine if any loading is happening and what message to show
  const isLoading = mpFormLoading || vlFormLoading || uploadGenerating;
  const loadingMessage = mpFormLoading ? "Generating..." : "Regenerating...";
  
  // Handle component updates from edit panel
  const handleComponentUpdate = (updatedDSL: string, updatedMWP: string) => {
    // Update the visual language and initial MWP
    saveInitialValues(updatedMWP, initialFormula);
    // Trigger regeneration with updated DSL
    setVLFormLoading(true);
    setResults(
      updatedDSL,
      null,  // Clear visuals to trigger regeneration
      null,
      undefined,
      undefined,
      undefined,
      updatedMWP,
      initialFormula,
      componentMappings
    );
    // Note: The actual regeneration would be triggered by the VisualLanguageForm
    // when it detects the DSL change
  };
  

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
              <div className="flex flex-col space-y-6 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:z-10">
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
                      highlightRanges={mwpHighlightRanges}
                    />
                  </div>

                  {/* Visual Language Column */}
                  <div className="flex flex-col min-h-0 md:min-h-[400px] xl:min-h-0">
                    {vl && (
                      <VisualLanguageForm
                        vl={vl}
                        onSuccess={setResults}
                        onLoadingChange={(loading, abortFn) => {
                          setVLFormLoading(loading, abortFn);
                        }}
                        onReset={resetVisuals}
                        highlightRanges={dslHighlightRanges}
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
                  componentMappings={componentMappings}
                  dslValue={vl || ''}
                  mwpValue={initialMWP}
                  onDSLRangeHighlight={(range) => {
                    // Clear highlights if range is [0, 0], otherwise set the range
                    if (range[0] === 0 && range[1] === 0) {
                      setDslHighlightRanges([]);
                    } else {
                      setDslHighlightRanges([range]);
                    }
                  }}
                  onMWPRangeHighlight={(range) => {
                    // Clear highlights if range is [0, 0], otherwise set the range
                    if (range[0] === 0 && range[1] === 0) {
                      setMwpHighlightRanges([]);
                    } else {
                      setMwpHighlightRanges([range]);
                    }
                  }}
                  onComponentUpdate={handleComponentUpdate}
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