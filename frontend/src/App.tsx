import './App.css';
import { useState } from 'react';
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";

import { GearLoading } from "@/components/ui/gear-loading";
import { Toaster } from "@/components/ui/sonner";
import { useAppState } from "@/hooks/useAppState";
import type { ComponentMapping } from "@/types/visualInteraction";
import { detectDSLChanges, updateMWPText } from "@/lib/dsl-utils";

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
    mwp,
    formula,
    componentMappings,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    saveInitialValues,
  } = useAppState();
  
  // State for highlighting
  const [dslHighlightRanges, setDslHighlightRanges] = useState<Array<[number, number]>>([]);
  const [mwpHighlightRanges, setMwpHighlightRanges] = useState<Array<[number, number]>>([]);
  const [currentDSLPath, setCurrentDSLPath] = useState<string | null>(null);

  // Wrapper to handle DSL→MWP sync and SVG preservation
  const handleVLResult = (
    nextVL: string,
    nextSvgFormal: string | null,
    nextSvgIntuitive: string | null,
    nextFormalError?: string,
    nextIntuitiveError?: string,
    nextMissing?: string[],
    nextMWPOverride?: string,
    nextFormula?: string,
    nextMappings?: ComponentMapping
  ) => {
    // Compute MWP updates from DSL diffs when override not provided
    let nextMWP = nextMWPOverride ?? mwp;
    if (!nextMWPOverride) {
      const changes = detectDSLChanges(vl ?? "", nextVL);
      if (changes.length > 0) {
        nextMWP = updateMWPText(mwp, changes);
      }
    }

    // Preserve existing SVGs if new ones are null
    const mergedSvgFormal = nextSvgFormal ?? svgFormal;
    const mergedSvgIntuitive = nextSvgIntuitive ?? svgIntuitive;

    // Preserve errors/missing/formula/mappings per merge policy:
    // - undefined => no change (keep existing)
    // - null      => explicitly clear (overwrite with null)
    const mergedFormalError = nextFormalError !== undefined ? nextFormalError : formalError;
    const mergedIntuitiveError = nextIntuitiveError !== undefined ? nextIntuitiveError : intuitiveError;
    const mergedMissing = nextMissing !== undefined ? nextMissing : missingSVGEntities;
    const mergedFormula = nextFormula !== undefined ? nextFormula : formula;
    const mergedMappings = nextMappings !== undefined ? nextMappings : componentMappings;

    setResults(
      nextVL,
      mergedSvgFormal,
      mergedSvgIntuitive,
      mergedFormalError,
      mergedIntuitiveError,
      mergedMissing,
      nextMWP,
      mergedFormula,
      mergedMappings
    );
  };
  

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        { !hasCompletedGeneration || mpFormLoading ? (
          /* Centered layout (initial state and during loading) */
          <div className="container mx-auto px-4 py-4 lg:px-8">
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
              {/* Header with enhanced visual hierarchy */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <img 
                      src="/math2visual-logo.svg" 
                      alt="Math2Visual Logo" 
                      className="w-10 h-10"
                    />
                  </div>
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    Math2Visual
                  </h1>
                </div>
                <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed font-medium">
                  Generating Pedagogically Meaningful Visuals for Math Word Problems
                </p>
                <div className="w-32 h-1 bg-primary/30 mx-auto rounded-full"></div>
              </div>
              
              {/* Centered Math Problem Form with minimal card styling */}
              <div className="w-full max-w-4xl mb-6">
                <div className="bg-white/30 backdrop-blur-sm border border-white/20 rounded-3xl p-4 lg:p-10 shadow-sm">
                  <MathProblemForm 
                    onSuccess={setResults}
                    onLoadingChange={(loading, abortFn) => {
                      setMpFormLoading(loading, abortFn);
                    }}
                    onReset={resetResults}
                    mwp={mwp}
                    formula={formula}
                    saveInitialValues={saveInitialValues}
                    rows={5}
                    hideSubmit={mpFormLoading}
                    largeFont={true}
                  />
                </div>
              </div>

              {/* Loading state with minimal styling */}
              {mpFormLoading && (
                <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                  <GearLoading 
                    message="Generating..." 
                    onAbort={handleAbort}
                    showAbortButton={true}
                    size="default"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Two-column layout after generation completes */
          <div className="container mx-auto px-4 py-4 lg:px-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[calc(100vh-2rem)] items-start">
              {/* Left Panel - Title / Input Forms */}
              <div className="flex flex-col space-y-8 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:z-10">
                 {/* Two-column input layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
                  {/* Math Problem Input Column */}
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-3">
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
                      mwp={mwp}
                      formula={formula}
                      saveInitialValues={saveInitialValues}
                      rows={8}
                      highlightRanges={mwpHighlightRanges}
                      hideSubmit={false}
                    />
                  </div>

                  {/* Visual Language Column */}
                  <div className="flex flex-col min-h-[300px] md:min-h-[400px] xl:min-h-0">
                    {vl && componentMappings && (
                      <VisualLanguageForm
                        vl={vl}
                        onResult={handleVLResult}
                        onLoadingChange={(loading, abortFn) => {
                          setVLFormLoading(loading, abortFn);
                        }}
                        highlightRanges={dslHighlightRanges}
                        onDSLPathHighlight={setCurrentDSLPath}
                        componentMappings={componentMappings}
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
                  mwpValue={mwp}
                  onDSLRangeHighlight={setDslHighlightRanges}
                  onMWPRangeHighlight={setMwpHighlightRanges}
                  onRegenerateAfterUpload={handleRegenerateAfterUpload}
                  onAllFilesUploaded={clearMissingSVGEntities}
                  currentDSLPath={currentDSLPath}
                />

                {/* Loading animation below the accordions when regenerating */}
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
            </div>
          </div>
        )}
      </div>
      <Toaster/>
    </>
  );
}

export default App;