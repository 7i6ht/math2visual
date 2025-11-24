import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { SparklesLoading } from "@/components/ui/sparkles-loading";
import { SessionAnalyticsDisplay } from "@/components/ui/SessionAnalyticsDisplay";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { trackColumnScroll, trackTwoColumnLayoutRender, trackElementClick, trackPanelResize, isAnalyticsEnabled, getSessionId, subscribeToScreenshotState, getIsCapturingScreenshot } from "@/services/analyticsTracker";
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
  }, []);

  // Track two column layout render and capture screenshot
  useEffect(() => {
    if (analyticsEnabled) {
      trackTwoColumnLayoutRender();
    }
  }, [analyticsEnabled]);

  const handleRegenerate = useCallback(async (
    analyticsEventName: string,
    currentMwp: string,
    currentFormula: string,
    currentHint: string
  ) => {
    if (!currentMwp) return;
    
    // Track regeneration
    if (analyticsEnabled) {
      trackElementClick(analyticsEventName);
    }
    
    try {
      const { generationService } = await import('@/api_services/generation');
      const controller = new AbortController();
      const abort = () => {
        controller.abort();
        setMpFormLoading(false);
      };
      
      setMpFormLoading(true, abort);
      
      const result = await generationService.generateFromMathProblem(
        currentMwp,
        currentFormula,
        currentHint,
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
        currentMwp,
        currentFormula,
        currentHint,
        result.componentMappings,
        result.is_parse_error
      );
    } catch (error) {
      console.error('Regeneration failed:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        const { toast } = await import('sonner');
        toast.error(error instanceof Error ? error.message : "An error occurred");
      }
    } finally {
      setMpFormLoading(false);
    }
  }, [setMpFormLoading, setResults, analyticsEnabled]);

  const handleRegenerateOnBlur = useCallback(async (
    fieldName: 'mwp' | 'formula' | 'hint',
    currentMwp: string,
    currentFormula: string,
    currentHint: string
  ) => {
    await handleRegenerate(`${fieldName}_regenerate_auto`, currentMwp, currentFormula, currentHint);
  }, [handleRegenerate]);


  const isFormLoading = mpFormLoading || vlFormLoading || uploadGenerating;

  // Reusable content blocks to avoid duplication
  const logoAndTitle = (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        <ResponsiveLogo className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 3xl:w-16 3xl:h-16 4xl:w-20 4xl:h-20 5xl:w-22 5xl:h-22" />
        <h1 className="responsive-title-simple font-bold">Math2Visual</h1>
      </div>
    </div>
  );

  const mathProblemForm = (
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
        hideSubmit={true}
        onRegenerateOnBlur={handleRegenerateOnBlur}
        isDisabled={isFormLoading}
        showHintInput={!!(svgFormal || svgIntuitive) && !hasParseError}
      />
    </div>
  );

  const visualLanguageForm = formattedDSL && (
    <VisualLanguageForm
      onResult={handleVLResult}
      onLoadingChange={(loading, abortFn) => {
        setVLFormLoading(loading, abortFn);
      }}
      mwp={mwp}
      formula={formula}
      isDisabled={isFormLoading}
    />
  );

  const visualizationResults = (
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
      isDisabled={isFormLoading}
    />
  );

  // Math problem column content
  const mathProblemColumn = (
    <div className="space-y-4 flex flex-col w-full h-full">
      {logoAndTitle}
      {mathProblemForm}
    </div>
  );

  // Visual language column content
  const visualLanguageColumn = (
    <div className="relative flex flex-col h-full w-full">
      {visualLanguageForm}
    </div>
  );

  // For mobile/tablet (non-resizable grid)
  const leftColumnContentGrid = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 flex-1 min-h-0 height-responsive-grid items-stretch lg:[@media(max-aspect-ratio:3/4)]:grid-cols-1 lg:[@media(max-aspect-ratio:3/4)]:items-start lg:[@media(max-aspect-ratio:3/4)]:flex lg:[@media(max-aspect-ratio:3/4)]:flex-col">
      <div className="space-y-4 flex flex-col w-full">
        {logoAndTitle}
        {mathProblemForm}
      </div>

      <div className="relative flex flex-col h-full w-full [@media(max-aspect-ratio:3/4)]:mt-4">
        {visualLanguageForm}
      </div>
    </div>
  );

  return (
    <div className="w-full px-1 py-4 sm:px-2 lg:px-4 xl:px-6 2xl:px-8 3xl:px-8 4xl:px-8">
      {analyticsEnabled && <SessionAnalyticsDisplay sessionId={sessionId} isCapturingScreenshot={isCapturingScreenshot} />}
      
      {formattedDSL && (
        // Resizable layout when Visual Language editor is visible (desktop only)
        <div className="hidden xl:block relative min-h-[calc(100vh-2rem)]">
          <ResizablePanelGroup 
            direction="horizontal" 
            className="flex gap-4 2xl:gap-6 3xl:gap-8"
            style={{ overflow: 'visible' }}
            {...(analyticsEnabled ? {onLayout: trackPanelResize} : {})}
          >
            {/* Math Problem Column */}
            <ResizablePanel 
              defaultSize={20} 
              minSize={15}
              maxSize={45}
              className="flex flex-col"
              style={{ overflow: 'visible' }}
            >
              <div 
                className="flex flex-col xl:sticky xl:top-6 xl:z-10 xl:h-[calc(100vh-3rem)]"
                {...(analyticsEnabled ? {onScroll: handleLeftColumnScroll} : {})}
              >
                {mathProblemColumn}
              </div>
            </ResizablePanel>

            <ResizableHandle 
              withHandle 
              className="w-1 bg-border hover:bg-blue-500 transition-colors"
            />

            {/* Visual Language Column */}
            <ResizablePanel 
              defaultSize={20}
              minSize={15}
              maxSize={45}
              collapsible={true}
              collapsedSize={0}
              className="flex flex-col"
            >
              <div 
                className="flex flex-col xl:sticky xl:top-6 xl:z-10 xl:h-[calc(100vh-3rem)]"
                {...(analyticsEnabled ? {onScroll: handleLeftColumnScroll} : {})}
              >
                {visualLanguageColumn}
              </div>
            </ResizablePanel>

            <ResizableHandle 
              withHandle 
              className="w-1 bg-border hover:bg-blue-500 transition-colors"
            />

            {/* Visualization Results Column */}
            <ResizablePanel 
              defaultSize={60}
              minSize={30}
              className="flex flex-col"
            >
              <div 
                className="relative flex flex-col w-full"
                {...(analyticsEnabled ? {onScroll: handleRightColumnScroll} : {})}
              >
                {visualizationResults}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* Grid layout: shown on mobile when DSL exists, or always when DSL doesn't exist */}
      <div className={`relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] 3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 min-h-[calc(100vh-2rem)] items-start ${formattedDSL ? 'xl:hidden' : ''}`}>
          <div 
            className="flex flex-col space-y-6 xl:space-y-8 xl:sticky xl:top-6 xl:z-10 xl:h-[calc(100vh-3rem)]"
            {...(analyticsEnabled ? {onScroll: handleLeftColumnScroll} : {})}
          >
            {leftColumnContentGrid}
          </div>

          <div 
            className="relative flex flex-col w-full"
            {...(analyticsEnabled ? {onScroll: handleRightColumnScroll} : {})}
          >
            {visualizationResults}
          </div>
        </div>
        
      {/* Loading overlay for Visual Language Form and Visualization Results */}
      {isFormLoading && (
        <>
          <div
            className="absolute inset-0 bg-background/60 dark:bg-black/40 backdrop-blur-[1px] z-40"
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="animate-in fade-in-0 duration-300 pointer-events-auto">
              <SparklesLoading
                onAbort={handleAbort}
                showAbortButton={true}
              />
            </div>
          </div>
        </>
      )}

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



