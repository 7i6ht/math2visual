import { useCallback, useEffect, useRef } from "react";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { GearLoading } from "@/components/ui/gear-loading";
import { useDSLContext } from "@/contexts/DSLContext";
import { useSVGSelector } from "@/hooks/useSVGSelector";
import { useVisualizationHandlers } from "@/hooks/useVisualizationHandlers";
import { usePopupManagement } from "@/hooks/usePopupManagement";
import { PopupManager } from "@/components/popups/PopupManager";
import type { useAppState } from "@/hooks/useAppState";

type Props = {
  appState: ReturnType<typeof useAppState>;
};

export function TwoColumnView({ appState }: Props) {
  const {
    vlFormLoading,
    mpFormLoading,
    svgFormal,
    svgIntuitive,
    formalError,
    intuitiveError,
    missingSVGEntities,
    uploadGenerating,
    mwp,
    formula,
    hint,
    showHint,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    setShowHint,
  } = appState;

  const { formattedDSL, parsedDSL, componentMappings } = useDSLContext();
  const hintInputRef = useRef<HTMLTextAreaElement | null>(null);

  const { handleVLResult } =
    useVisualizationHandlers({
      svgFormal,
      svgIntuitive,
      formalError,
      intuitiveError,
      missingSVGEntities,
      mwp,
      formula,
      setResults
    });

  const { selectorState, openSelector, closeSelector, handleEmbeddedSVGChange } =
    useSVGSelector({
      onVisualsUpdate: (data) => {
        setResults(
          data.visual_language,
          data.svg_formal,
          data.svg_intuitive,
          data.parsedDSL,
          data.formal_error,
          data.intuitive_error,
          data.missing_svg_entities,
          undefined,
          undefined,
          data.componentMappings
        );
      },
    });

  const handleEmbeddedSVGClickWithSelector = useCallback(
    (dslPath: string, event: MouseEvent, visualType: 'formal' | 'intuitive') => {
      const normalizedPath = dslPath.endsWith("]") ? dslPath.slice(0, -3) : dslPath;

      const typeMapping = componentMappings?.[normalizedPath];
      const currentValue = typeMapping?.property_value || "";
      openSelector(dslPath, currentValue, event, visualType);
    },
    [componentMappings, openSelector]
  );

  const popup = usePopupManagement({
    onVisualsUpdate: (data) => {
      handleVLResult(
        data.visual_language,
        data.svg_formal,
        data.svg_intuitive,
        data.parsedDSL,
        parsedDSL!,
        data.formal_error ?? undefined,
        data.intuitive_error ?? undefined,
        data.missing_svg_entities,
        undefined,
        undefined,
        data.componentMappings
      );
    },
  });

  // Ensure the field is visible whenever hint text exists
  useEffect(() => {
    if (hint?.trim()) {
      setShowHint(true);
    }
  }, [hint, setShowHint]);

  const handleShowHint = useCallback(() => {
    setShowHint(true);
    // Focus and scroll to the hint input after DOM update
    setTimeout(() => {
      if (hintInputRef.current) {
        hintInputRef.current.focus();
        hintInputRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 0);
  }, [setShowHint, hintInputRef]);


  return (
    <div className="container mx-auto px-4 py-4 lg:px-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[calc(100vh-2rem)] items-start">
        <div className="flex flex-col space-y-8 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <ResponsiveLogo className="w-8 h-8 sm:w-10 sm:h-10" />
                  <h1 className="text-2xl sm:text-3xl font-bold">Math2Visual</h1>
                </div>
              </div>

              <div className="flex flex-col">
                <MathProblemForm
                  onSuccess={setResults}
                  onLoadingChange={(loading, abortFn) => {
                    setMpFormLoading(loading, abortFn);
                  }}
                  onReset={resetResults}
                  mwp={mwp}
                  formula={formula}
                  hint={hint}
                  saveInitialValues={appState.saveInitialValues}
                  rows={8}
                  hideSubmit={false}
                  showHint={showHint}
                  hintInputRef={hintInputRef}
                />
                {mpFormLoading && (
                  <div className="animate-in fade-in-0 duration-300">
                    <GearLoading
                      message={"Generating..."}
                      onAbort={handleAbort}
                      showAbortButton={true}
                      size="small"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex flex-col min-h-[300px] md:min-h-[400px] xl:min-h-0">
              {formattedDSL && (
                <VisualLanguageForm
                  onResult={handleVLResult}
                  onLoadingChange={(loading, abortFn) => {
                    setVLFormLoading(loading, abortFn);
                  }}
                  isDisabled={mpFormLoading}
                />
              )}
              {(vlFormLoading || uploadGenerating) && (
                <div className="mt-8 animate-in fade-in-0 duration-300">
                  <GearLoading
                    message={"Regenerating..."}
                    onAbort={handleAbort}
                    showAbortButton={true}
                    size="small"
                  />
                </div>
              )}
              {mpFormLoading && (
                <div
                  className="absolute inset-0 z-10 bg-background/50 dark:bg-black/30 backdrop-blur-[1px] rounded-md pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col w-full">
          <VisualizationResults
            svgFormal={svgFormal}
            formalError={formalError}
            svgIntuitive={svgIntuitive}
            intuitiveError={intuitiveError}
            missingSVGEntities={missingSVGEntities}
            mwpValue={mwp}
            formulaValue={formula}
            onRegenerateAfterUpload={handleRegenerateAfterUpload}
            onAllFilesUploaded={clearMissingSVGEntities}
            onEmbeddedSVGClick={handleEmbeddedSVGClickWithSelector}
            onEntityQuantityClick={popup.handleEntityQuantityClick}
            onContainerNameClick={popup.handleContainerNameClick}
            isSelectorOpen={selectorState.isOpen}
            onShowHint={handleShowHint}
            isDisabled={mpFormLoading}
          />
          { (mpFormLoading || vlFormLoading || uploadGenerating) && (
            <div
              className="absolute inset-0 bg-background/60 dark:bg-black/40 backdrop-blur-[1px] rounded-md pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      <PopupManager
        isSelectorOpen={selectorState.isOpen}
        visualType={selectorState.visualType}
        onCloseSelector={closeSelector}
        onEmbeddedSVGChange={handleEmbeddedSVGChange}
        quantityPopupState={popup.quantityPopupState}
        closeQuantityPopup={popup.closeQuantityPopup}
        updateEntityQuantity={popup.updateEntityQuantity}
        containerNamePopupState={popup.containerNamePopupState}
        closeContainerNamePopup={popup.closeContainerNamePopup}
        updateContainerName={popup.updateContainerName}
      />
    </div>
  );
}


