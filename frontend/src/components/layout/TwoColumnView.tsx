import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { GearLoading } from "@/components/ui/gear-loading";
import { SessionAnalyticsDisplay } from "@/components/ui/SessionAnalyticsDisplay";
import { trackColumnScroll, trackTwoColumnLayoutRender, trackElementClick, isAnalyticsEnabled, getSessionId, subscribeToScreenshotState, getIsCapturingScreenshot } from "@/services/analyticsTracker";
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
    hasParseError,
    missingSVGEntities,
    uploadGenerating,
    mwp,
    formula,
    hint,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
    setHint,
  } = appState;

  const { formattedDSL } = useDSLContext();
  const analyticsEnabled = isAnalyticsEnabled();
  const sessionId = getSessionId();
  const isCapturingScreenshot = useSyncExternalStore(
    subscribeToScreenshotState,
    getIsCapturingScreenshot,
    () => false // Server snapshot (always false on server)
  );

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

  const onVisualsUpdate = useCallback((data: any) => {
    handleVLResult(
      data.visual_language,
      data.svg_formal,
      data.svg_intuitive,
      data.parsedDSL,
      data.formal_error ?? undefined,
      data.intuitive_error ?? undefined,
      data.missing_svg_entities,
      undefined,
      undefined,
      data.componentMappings,
      undefined // Popup updates shouldn't introduce parse errors
    );
  }, [handleVLResult]);

  const popup = usePopupManagement({
    onVisualsUpdate,
  });

  const handleLeftColumnScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    trackColumnScroll(event, 'left');
  }, []);

  const handleRightColumnScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    trackColumnScroll(event, 'right');
  }, [trackColumnScroll]);

  // Track two column layout render and capture screenshot
  useEffect(() => {
    if (analyticsEnabled) {
      trackTwoColumnLayoutRender();
    }
  }, []);

  const handleRegenerateWithHint = useCallback(async () => {
    if (!mwp) return;
    
    // Track hint regeneration
    if (analyticsEnabled) {
      trackElementClick('hint_regenerate_auto');
    }
    
    // Use the existing MathProblemForm logic by calling saveInitialValues and setResults
    // This will trigger the generation with the current hint value
    try {
      setMpFormLoading(true);
      
      const { generationService } = await import('@/api_services/generation');
      const controller = new AbortController();
      const abort = () => {
        controller.abort();
        setMpFormLoading(false);
      };
      
      setMpFormLoading(true, abort);
      
      const result = await generationService.generateFromMathProblem(
        mwp,
        formula,
        hint,
        controller.signal
      );
      
      setResults(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.parsedDSL!,
        result.formal_error || undefined,
        result.intuitive_error || undefined,
        result.missing_svg_entities,
        mwp,
        formula,
        result.componentMappings
      );
    } catch (error) {
      console.error('Hint regeneration failed:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        const { toast } = await import('sonner');
        toast.error(error instanceof Error ? error.message : "An error occurred");
      }
    } finally {
      setMpFormLoading(false);
    }
  }, [mwp, formula, hint, setMpFormLoading, setResults, analyticsEnabled]);



  return (
    <div className="w-full px-1 py-4 sm:px-2 lg:px-4 xl:px-6 2xl:px-8 3xl:px-8 4xl:px-8">
      {analyticsEnabled && <SessionAnalyticsDisplay sessionId={sessionId} isCapturingScreenshot={isCapturingScreenshot} />}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] 3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 min-h-[calc(100vh-2rem)] items-start">
        <div 
          className="flex flex-col space-y-6 xl:space-y-8 xl:sticky xl:top-6 xl:z-10 xl:pr-2 xl:h-[calc(100vh-3rem)]"
          {...(analyticsEnabled ? {onScroll: handleLeftColumnScroll} : {})}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 flex-1 min-h-0 height-responsive-grid items-stretch lg:[@media(max-aspect-ratio:3/4)]:grid-cols-1 lg:[@media(max-aspect-ratio:3/4)]:items-start lg:[@media(max-aspect-ratio:3/4)]:flex lg:[@media(max-aspect-ratio:3/4)]:flex-col">
            <div className="space-y-4 flex flex-col w-full">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <ResponsiveLogo className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 3xl:w-16 3xl:h-16 4xl:w-20 4xl:h-20 5xl:w-22 5xl:h-22" />
                  <h1 className="responsive-title-simple font-bold">Math2Visual</h1>
                </div>
              </div>

              <div className="flex flex-col w-full">
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
                  hideSubmit={mpFormLoading}
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

            <div className="relative flex flex-col h-full w-full [@media(max-aspect-ratio:3/4)]:mt-4">
              {formattedDSL && (
                <VisualLanguageForm
                  onResult={handleVLResult}
                  onLoadingChange={(loading, abortFn) => {
                    setVLFormLoading(loading, abortFn);
                  }}
                  mwp={mwp}
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

        <div 
          className="relative flex flex-col w-full"
          {...(analyticsEnabled ? {onScroll: handleRightColumnScroll} : {})}
        >
          <VisualizationResults
            svgFormal={svgFormal}
            formalError={formalError}
            svgIntuitive={svgIntuitive}
            intuitiveError={intuitiveError}
            hasParseError={hasParseError}
            missingSVGEntities={missingSVGEntities}
            mwpValue={mwp}
            formulaValue={formula}
            onRegenerateAfterUpload={handleRegenerateAfterUpload}
            onAllFilesUploaded={clearMissingSVGEntities}
            onEmbeddedSVGClick={popup.handleEmbeddedSVGClick}
            onEntityQuantityClick={popup.handleEntityQuantityClick}
            onNameClick={popup.handleNameClick}
            isPopupOpen={popup.selectorPopupState.isOpen || popup.namePopupState.isOpen || popup.quantityPopupState.isOpen}
            hint={hint}
            onHintChange={setHint}
            onRegenerateWithHint={handleRegenerateWithHint}
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



