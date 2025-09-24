import "./App.css";
import { useCallback } from "react";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { SVGActionMenu } from "@/components/popups/SVGActionMenu";
import { EntityQuantityPopup } from "@/components/popups/EntityQuantityPopup";
import { ContainerNamePopup } from "@/components/popups/ContainerNamePopup";

import { GearLoading } from "@/components/ui/gear-loading";
import { Toaster } from "@/components/ui/sonner";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { useAppState } from "@/hooks/useAppState";
import { useSVGSelector } from "@/hooks/useSVGSelector";
import { useEntityQuantityPopup } from "@/hooks/useEntityQuantityPopup";
import { useContainerNamePopup } from "@/hooks/useContainerNamePopup";
import {
  HighlightingProvider,
  useHighlightingContext,
} from "@/contexts/HighlightingContext";
import { DSLProvider, useDSLContext } from "@/contexts/DSLContext";
import type { ParsedOperation } from "@/utils/dsl-parser";
import type { ComponentMapping } from "@/types/visualInteraction";
import { detectDSLChanges, updateMWPText } from "@/lib/dsl-utils";

function AppContent() {
  const {
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
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    saveInitialValues,
  } = useAppState();

  // Use highlighting context instead of local state
  const { dslHighlightRanges, mwpHighlightRanges, setCurrentDSLPath } =
    useHighlightingContext();

  // Use DSL context for centralized DSL state
  const {
    formattedDSL,
    parsedDSL,
    componentMappings: contextComponentMappings,
    setGenerationResult,
  } = useDSLContext();

  // SVG Selector functionality
  const {
    selectorState,
    openSelector,
    closeSelector,
    handleEmbeddedSVGChange,
  } = useSVGSelector({
    onVisualsUpdate: (data) => {
      setResults(
        data.visual_language,
        data.svg_formal,
        data.svg_intuitive,
        data.parsedDSL,
        data.formal_error,
        data.intuitive_error,
        data.missing_svg_entities,
        undefined, // mwp - unchanged
        undefined, // formula - unchanged
        data.componentMappings
      );
    },
  });

  // Entity Quantity Popup functionality
  const {
    popupState: quantityPopupState,
    openPopup: openQuantityPopup,
    closePopup: closeQuantityPopup,
    updateEntityQuantity,
  } = useEntityQuantityPopup({
    onVisualsUpdate: (data) => {
      handleVLResult(
        data.visual_language,
        data.svg_formal,
        data.svg_intuitive,
        data.parsedDSL,
        parsedDSL!, // current parsed DSL for comparison
        data.formal_error ?? undefined,
        data.intuitive_error ?? undefined,
        data.missing_svg_entities,
        undefined, // mwp - will be auto-updated by handleVLResult
        undefined, // formula - will be auto-updated by handleVLResult
        data.componentMappings
      );
    },
  });

  // Container Name Popup functionality
  const {
    popupState: containerNamePopupState,
    openPopup: openContainerNamePopup,
    closePopup: closeContainerNamePopup,
    updateContainerName,
  } = useContainerNamePopup({
    onVisualsUpdate: (data) => {
      handleVLResult(
        data.visual_language,
        data.svg_formal,
        data.svg_intuitive,
        data.parsedDSL,
        parsedDSL!, // current parsed DSL for comparison
        data.formal_error ?? undefined,
        data.intuitive_error ?? undefined,
        data.missing_svg_entities,
        undefined, // mwp - will be auto-updated by handleVLResult
        undefined, // formula - will be auto-updated by handleVLResult
        data.componentMappings
      );
    },
  });

  // Wrapper for openSelector that extracts current type from DSL context
  const handleEmbeddedSVGClick = useCallback(
    (dslPath: string, event: MouseEvent) => {
      const typeMapping = contextComponentMappings?.[dslPath];
      const currentValue = typeMapping?.property_value || "";
      openSelector(dslPath, currentValue, event);
    },
    [contextComponentMappings, openSelector]
  );

  // Wrapper for openQuantityPopup that passes the DSL path directly
  const handleEntityQuantityClick = useCallback(
    (dslPath: string, event: MouseEvent) => {
      openQuantityPopup(dslPath, event);
    },
    [openQuantityPopup]
  );

  // Wrapper for openContainerNamePopup that passes the DSL path directly
  const handleContainerNameClick = useCallback(
    (dslPath: string, event: MouseEvent) => {
      openContainerNamePopup(dslPath, event);
    },
    [openContainerNamePopup]
  );

  // Wrapper to handle DSL→MWP sync and SVG preservation
  const handleVLResult = (
    nextVL: string,
    nextSvgFormal: string | null,
    nextSvgIntuitive: string | null,
    nextParsedDSL: ParsedOperation,
    currentParsedDSL: ParsedOperation,
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
      const changes = detectDSLChanges(currentParsedDSL, nextParsedDSL);
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
    const mergedFormalError =
      nextFormalError !== undefined ? nextFormalError : formalError;
    const mergedIntuitiveError =
      nextIntuitiveError !== undefined ? nextIntuitiveError : intuitiveError;
    const mergedMissing =
      nextMissing !== undefined ? nextMissing : missingSVGEntities;
    const mergedFormula = nextFormula !== undefined ? nextFormula : formula;
    const mergedMappings =
      nextMappings !== undefined ? nextMappings : contextComponentMappings;

    setResults(
      nextVL,
      mergedSvgFormal,
      mergedSvgIntuitive,
      nextParsedDSL,
      mergedFormalError,
      mergedIntuitiveError,
      mergedMissing,
      nextMWP,
      mergedFormula,
      mergedMappings || undefined
    );

    // Update DSL context with new data
    if (nextVL && mergedMappings) {
      setGenerationResult({
        visual_language: nextVL,
        componentMappings: mergedMappings,
        parsedDSL: nextParsedDSL,
      });
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        {!hasCompletedGeneration || mpFormLoading ? (
          /* Centered layout (initial state and during loading) */
          <div className="container mx-auto px-4 py-4 lg:px-8">
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
              {/* Header with enhanced visual hierarchy */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <ResponsiveLogo className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14" />
                  <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    Math2Visual
                  </h1>
                </div>
                <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed font-medium">
                  Generating Pedagogically Meaningful Visuals for Math Word
                  Problems
                </p>
              </div>

              {/* Centered Math Problem Form */}
              <div className="w-full max-w-4xl mt-6 mb-6">
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
                        <ResponsiveLogo className="w-8 h-8 sm:w-10 sm:h-10" />
                        <h1 className="text-2xl sm:text-3xl font-bold">Math2Visual</h1>
                      </div>
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
                  <div className="flex flex-col min-h-[300px] md:min_h-[400px] xl:min-h-0">
                    {formattedDSL && (
                      <VisualLanguageForm
                        onResult={handleVLResult}
                        onLoadingChange={(loading, abortFn) => {
                          setVLFormLoading(loading, abortFn);
                        }}
                        highlightRanges={dslHighlightRanges}
                        onDSLPathHighlight={setCurrentDSLPath}
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
                  mwpValue={mwp}
                  onRegenerateAfterUpload={handleRegenerateAfterUpload}
                  onAllFilesUploaded={clearMissingSVGEntities}
                  onEmbeddedSVGClick={handleEmbeddedSVGClick}
                  onEntityQuantityClick={handleEntityQuantityClick}
                  onContainerNameClick={handleContainerNameClick}
                  isSelectorOpen={selectorState.isOpen}
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

      {/* SVG Action Menu + Popups */}
      {selectorState.isOpen && (
        <SVGActionMenu
          onClosePopup={closeSelector}
          onEmbeddedSVGChange={handleEmbeddedSVGChange}
        />
      )}

      {/* Entity Quantity Popup */}
      {quantityPopupState.isOpen && (
        <EntityQuantityPopup
          onClose={closeQuantityPopup}
          onUpdate={updateEntityQuantity}
          dslPath={quantityPopupState.dslPath}
        />
      )}

      {/* Container Name Popup */}
      {containerNamePopupState.isOpen && (
        <ContainerNamePopup
          onClose={closeContainerNamePopup}
          onUpdate={updateContainerName}
          dslPath={containerNamePopupState.dslPath}
        />
      )}

      <Toaster />
    </>
  );
}

function App() {
  return (
    <HighlightingProvider>
      <DSLProvider>
        <AppContent />
      </DSLProvider>
    </HighlightingProvider>
  );
}

export default App;
