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
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    saveInitialValues,
  } = useAppState();
  
  // State for highlighting
  const [dslHighlightRanges, setDslHighlightRanges] = useState<Array<[number, number]>>([]);
  const [mwpHighlightRanges, setMwpHighlightRanges] = useState<Array<[number, number]>>([]);
  
  // Handle component updates from edit panel
  const handleComponentUpdate = (updatedDSL: string, updatedMWP: string) => {
    // Update the visual language and initial MWP
    saveInitialValues(updatedMWP, initialFormula);
    // Trigger regeneration with updated DSL
    setVLFormLoading(true);
    setResults(
      updatedDSL,
      svgFormal,  // Keep existing formal visual during regeneration
      svgIntuitive,  // Keep existing intuitive visual during regeneration
      formalError,
      intuitiveError,
      missingSVGEntities,
      updatedMWP,
      initialFormula,
      componentMappings
    );
    // Note: The actual regeneration would be triggered by the VisualLanguageForm
    // when it detects the DSL change
  };
  

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {!hasCompletedGeneration ? (
          /* Centered layout (initial state and during loading) */
          <div className="container mx-auto px-4 py-4 lg:px-8">
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
              {/* Header with enhanced visual hierarchy */}
              <div className="text-center mb-8 space-y-3">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <img 
                      src="/math2visual-logo.svg" 
                      alt="Math2Visual Logo" 
                      className="w-8 h-8"
                    />
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Math2Visual
                  </h1>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                  Generating Pedagogically Meaningful Visuals for Math Word Problems
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-primary/50 to-primary mx-auto rounded-full"></div>
              </div>
              
              {/* Centered Math Problem Form with card styling */}
              <div className="w-full max-w-3xl mb-4">
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 lg:p-8 shadow-lg">
                  <MathProblemForm 
                    onSuccess={setResults}
                    onLoadingChange={(loading, abortFn) => {
                      setMpFormLoading(loading, abortFn);
                    }}
                    onReset={resetResults}
                    initialMwp={initialMWP}
                    initialFormula={initialFormula}
                    saveInitialValues={saveInitialValues}
                    rows={5}
                  />
                </div>
              </div>

              {/* Loading state with better positioning and spacing */}
              {mpFormLoading && (
                <div className="animate-in fade-in-0 duration-300">
                  <GearLoading 
                    message={"Generating..."} 
                    onAbort={handleAbort}
                    showAbortButton={true}
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
                  onDSLRangeHighlight={setDslHighlightRanges}
                  onMWPRangeHighlight={setMwpHighlightRanges}
                  onComponentUpdate={handleComponentUpdate}
                  onRegenerateAfterUpload={handleRegenerateAfterUpload}
                  onAllFilesUploaded={clearMissingSVGEntities}
                />

                {/* Loading animation below the accordions when regenerating */}
                {(vlFormLoading || uploadGenerating) && (
                  <div className="mt-6 animate-in fade-in-0 duration-300">
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