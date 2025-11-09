import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { HorizontalMathProblemForm } from "@/components/forms/HorizontalMathProblemForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { GearLoading } from "@/components/ui/gear-loading";
import { SessionAnalyticsDisplay } from "@/components/ui/SessionAnalyticsDisplay";
import { trackColumnScroll, trackTwoColumnLayoutRender, isAnalyticsEnabled, getSessionId, subscribeToScreenshotState, getIsCapturingScreenshot } from "@/services/analyticsTracker";
import { useDSLContext } from "@/contexts/DSLContext";
import { useVisualizationHandlers } from "@/hooks/useVisualizationHandlers";
import { usePopupManagement } from "@/hooks/usePopupManagement";
import { PopupManager } from "@/components/popups/PopupManager";
import type { useAppState } from "@/hooks/useAppState";

type Props = {
  appState: ReturnType<typeof useAppState>;
};

export function TwoColumnView({ appState }: Props) { // TODO: Rename?
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
    setMpFormLoading,
    setResults,
    resetResults,
    clearMissingSVGEntities,
    handleRegenerateAfterUpload,
    handleAbort,
  } = appState;

  const { parsedDSL } = useDSLContext();
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
      parsedDSL!,
      data.formal_error ?? undefined,
      data.intuitive_error ?? undefined,
      data.missing_svg_entities,
      undefined,
      undefined,
      data.componentMappings
    );
  }, [handleVLResult, parsedDSL]);

  const popup = usePopupManagement({
    onVisualsUpdate,
  });

  const handleMainScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    trackColumnScroll(event, 'left');
  }, []);

  // Track layout render and capture screenshot
  useEffect(() => {
    if (analyticsEnabled) {
      trackTwoColumnLayoutRender();
    }
  }, [analyticsEnabled]);

  return (
    <div 
      className="w-full px-2 py-4 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24"
      {...(analyticsEnabled ? {onScroll: handleMainScroll} : {})}
    >
      {analyticsEnabled && <SessionAnalyticsDisplay sessionId={sessionId} isCapturingScreenshot={isCapturingScreenshot}/>}
      
      <div className="w-full mx-auto space-y-4 md:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-8 3xl:space-y-10 4xl:space-y-12 5xl:space-y-14">
        {/* Math Problem Form with Logo */}
        <div className="relative">
          <div className="flex gap-4 md:gap-6 lg:gap-8 3xl:gap-10 4xl:gap-12 5xl:gap-16 items-start">
            {/* Logo Section with Vertical M2V - constrained height */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1 max-h-[100px] 2xl:max-h-[120px] 3xl:max-h-[160px] 4xl:max-h-[200px] 5xl:max-h-[280px] 6xl:max-h-[350px]">
              <ResponsiveLogo className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 2xl:w-16 2xl:h-16 3xl:w-20 3xl:h-20 4xl:w-24 4xl:h-24 5xl:w-32 5xl:h-32 6xl:w-40 6xl:h-40" />
              <div className="flex flex-col items-center leading-tight gap-0">
                <span className="text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold 3xl:text-4xl 4xl:text-5xl 5xl:text-6xl 6xl:text-7xl">M</span>
                <span className="text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold 3xl:text-4xl 4xl:text-5xl 5xl:text-6xl 6xl:text-7xl">2</span>
                <span className="text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold 3xl:text-4xl 4xl:text-5xl 5xl:text-6xl 6xl:text-7xl">V</span>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1">
              <HorizontalMathProblemForm
                onSuccess={setResults}
                onLoadingChange={(loading, abortFn) => {
                  setMpFormLoading(loading, abortFn);
                }}
                onReset={resetResults}
                mwp={mwp}
                formula={formula}
                hint={hint}
                saveInitialValues={appState.saveInitialValues}
              />
            </div>
          </div>
        </div>

        {/* Visual Language Form (DSL Editor) - Hidden */}
        {/* {formattedDSL && (
          <div className="relative">
            <VisualLanguageForm
              onResult={handleVLResult}
              onLoadingChange={(loading, abortFn) => {
                setVLFormLoading(loading, abortFn);
              }}
              isDisabled={mpFormLoading}
            />
            {(vlFormLoading || uploadGenerating) && (
              <div className="mt-6 animate-in fade-in-0 duration-300">
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
        )} */}

        {/* Visualization Results */}
        <div className="relative">
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
            isDisabled={mpFormLoading}
          />
          { (mpFormLoading || vlFormLoading || uploadGenerating) && (
            <>
              <div
                className="absolute inset-0 bg-background/60 dark:bg-black/40 backdrop-blur-[1px] rounded-md pointer-events-none"
                aria-hidden="true"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <GearLoading
                  onAbort={handleAbort}
                  showAbortButton={true}
                />
              </div>
            </>
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



