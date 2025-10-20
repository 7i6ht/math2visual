import { useCallback, useEffect, useRef, useState } from "react";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { GearLoading } from "@/components/ui/gear-loading";
import { useDSLContext } from "@/contexts/DSLContext";
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

  const { formattedDSL, parsedDSL } = useDSLContext();
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
    <div className="w-full px-1 py-4 sm:px-2 lg:px-4 xl:px-6 2xl:px-8 3xl:px-8 4xl:px-8">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] 3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 min-h-[calc(100vh-2rem)] items-start [@media(min-height:1200px)_and_(max-width:1600px)]:grid-cols-1 [@media(min-height:1400px)_and_(max-width:1800px)]:grid-cols-1">
        <div className="flex flex-col space-y-6 xl:space-y-8 xl:sticky xl:top-6 xl:z-10 xl:pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 flex-1 min-h-0 height-responsive-grid items-stretch [@media(min-height:1200px)_and_(max-width:1600px)]:grid-cols-1 [@media(min-height:1400px)_and_(max-width:1800px)]:grid-cols-1">
            <div className="space-y-4 flex flex-col">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <ResponsiveLogo className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 3xl:w-16 3xl:h-16 4xl:w-20 4xl:h-20 5xl:w-24 5xl:h-24" />
                  <h1 className="responsive-title-simple font-bold">Math2Visual</h1>
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
                  rows={9.5}
                  hideSubmit={false}
                  showHint={showHint}
                  hintInputRef={hintInputRef}
                />
                {mpFormLoading && (
                  <div className="animate-in fade-in-0 duration-300">
                    <GearLoading
                      onAbort={handleAbort}
                      showAbortButton={true}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex flex-col min-h-[300px] md:min-h-[400px] xl:min-h-0 h-full">
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
                    onAbort={handleAbort}
                    showAbortButton={true}
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
            onEmbeddedSVGClick={popup.handleEmbeddedSVGClick}
            onEntityQuantityClick={popup.handleEntityQuantityClick}
            onNameClick={popup.handleNameClick}
            isPopupOpen={popup.selectorPopupState.isOpen || popup.namePopupState.isOpen || popup.quantityPopupState.isOpen}
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
        selectorPopupState={popup.selectorPopupState}
        closeSelectorPopup={popup.closeSelectorPopup}
        updateSVG={popup.updateSVG}
        quantityPopupState={popup.quantityPopupState}
        closeQuantityPopup={popup.closeQuantityPopup}
        updateEntityQuantity={popup.updateEntityQuantity}
        namePopupState={popup.namePopupState}
        closeNamePopup={popup.closeNamePopup}
        updateName={popup.updateName}
      />
    </div>
  );
}



