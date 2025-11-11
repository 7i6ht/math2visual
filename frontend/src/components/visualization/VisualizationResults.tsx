import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useCallback, memo } from "react";
import { VisualizationSection } from "./VisualizationSection";
import { MissingSVGSection } from "./MissingSVGSection";
import { ParseErrorSection } from "./ParseErrorSection";
import { AlertCircle } from "lucide-react";
import { trackElementClick, trackHintType, isAnalyticsEnabled } from "@/services/analyticsTracker";

interface VisualizationResultsProps {
  svgFormal: string | null;
  formalError: string | null;
  svgIntuitive: string | null;
  intuitiveError: string | null;
  hasParseError?: boolean;
  missingSVGEntities?: string[];
  mwpValue?: string;
  formulaValue?: string;
  onRegenerateAfterUpload?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
  onEmbeddedSVGClick: (event: MouseEvent) => void;
  onEntityQuantityClick: (event: MouseEvent) => void;
  onNameClick: (event: MouseEvent) => void;
  isPopupOpen?: boolean;
  isDisabled?: boolean;
  hint?: string;
  onHintChange: (value: string) => void;
  onRegenerateWithHint?: () => void;
}

export const VisualizationResults = memo(({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
  hasParseError = false,
  missingSVGEntities = [],
  mwpValue = '',
  formulaValue = '',
  onRegenerateAfterUpload,
  onAllFilesUploaded,
  onEmbeddedSVGClick,
  onEntityQuantityClick,
  onNameClick,
  isPopupOpen = false,
  isDisabled = false,
  hint = '',
  onHintChange,
  onRegenerateWithHint,
}: VisualizationResultsProps) => {
  const [activeTab, setActiveTab] = useState<string>("");
  const analyticsEnabled = isAnalyticsEnabled();

  const handleHintChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onHintChange(e.target.value);
    if (analyticsEnabled) {
      trackHintType();
    }
  }, [onHintChange, analyticsEnabled, trackHintType]);

  const handleHintBlur = useCallback(() => {
    // Trigger regeneration if hint is non-empty
    if (hint.trim() && onRegenerateWithHint && !isDisabled) {
      onRegenerateWithHint();
    }
  }, [hint, onRegenerateWithHint, isDisabled]);

  // Suppress generic missing-SVG errors in the tabs; these are shown
  // more helpfully in the dedicated MissingSVGSection below
  const filterMissingSvgError = (error: string | null): string | null => {
    if (!error) return error;
    // Backend raises FileNotFoundError as: "SVG file not found: <path>"
    return /SVG file not found/i.test(error) ? null : error;
  };

  const filteredFormalError = filterMissingSvgError(formalError);
  const filteredIntuitiveError = filterMissingSvgError(intuitiveError);
    
  // Auto-select appropriate tab when content changes
  const getDefaultTab = useCallback(() => {
    // Check for parse errors first
    if (hasParseError) return "parse-error";
    if (formalError && intuitiveError && missingSVGEntities.length > 0) return "missing-svg";
    return "formal";
  }, [hasParseError, formalError, intuitiveError, missingSVGEntities]);

  // Update active tab only when:
  // 1. No tab is selected (initial state)
  // 2. Current tab becomes invalid (e.g., parse error tab but no parse error anymore)
  useEffect(() => {    
    // Only set default tab if:
    // - No tab is currently active (initial state)
    // - Current tab is invalid (e.g., parse-error tab but no parse error, or vice versa)
    const isCurrentTabInvalid = 
      (activeTab === "parse-error" && !hasParseError) ||
      (activeTab === "missing-svg" && missingSVGEntities.length === 0) ||
      (activeTab === "formal" && hasParseError) ||
      (activeTab === "intuitive" && hasParseError);
    
    if (!activeTab || isCurrentTabInvalid) {
      const defaultTab = getDefaultTab();
      setActiveTab(defaultTab);
    }
  }, [getDefaultTab, activeTab, hasParseError, missingSVGEntities.length]);
  
  // Don't render if no content or errors at all
  if (!svgFormal && !formalError && !svgIntuitive && !intuitiveError && missingSVGEntities.length === 0) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <Tabs 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 h-auto">
          {/* Show parse error tab when parse error exists */}
          {hasParseError && (
            <TabsTrigger 
              value="parse-error"
              className="responsive-text-font-size data-[state=active]:bg-destructive/10"
              disabled={isDisabled}
            >
              <AlertCircle className="responsive-smaller-icon-font-size mr-2 text-destructive" />
              Parse Error
            </TabsTrigger>
          )}

          {/* Hide visualization tabs if parse error exists */}
          {!hasParseError && (
            <>
              <TabsTrigger 
                value="formal"
                className="responsive-text-font-size"
                disabled={isDisabled}
                {...(analyticsEnabled ? {onClick: () => trackElementClick('tab_formal_click')} : {})}
              >
                Formal Visual
              </TabsTrigger>

              <TabsTrigger 
                value="intuitive"
                className="responsive-text-font-size"
                disabled={isDisabled}
                {...(analyticsEnabled ? {onClick: () => trackElementClick('tab_intuitive_click')} : {})}
              >
                Intuitive Visual
              </TabsTrigger>
            </>
          )}

          {missingSVGEntities.length > 0 && (
            <TabsTrigger 
              value="missing-svg"
              className="responsive-text-font-size data-[state=active]:bg-destructive/10"
              disabled={isDisabled}
              {...(analyticsEnabled ? {onClick: () => trackElementClick('tab_missing_svg_click')} : {})}
            >
              <AlertCircle className="responsive-smaller-icon-font-size mr-2 text-destructive" />
              Missing SVG
            </TabsTrigger>
          )}
        </TabsList>

        {/* Parse error content */}
        {hasParseError && (
          <TabsContent value="parse-error" className="mt-4">
            <ParseErrorSection message="Could not parse Visual Language." />
          </TabsContent>
        )}

        {/* Visualization contents */}
        {!hasParseError && (
          <>
            <TabsContent value="formal" className="mt-4">
              <VisualizationSection
                type="formal"
                title="Formal"
                svgContent={svgFormal}
                error={filteredFormalError}
                isOpen={activeTab === "formal"}
                mwpValue={mwpValue}
                formulaValue={formulaValue}
                onEmbeddedSVGClick={onEmbeddedSVGClick}
                onEntityQuantityClick={onEntityQuantityClick}
                onNameClick={onNameClick}
                isPopupOpen={isPopupOpen}
                isDisabled={isDisabled}
              />
            </TabsContent>

            <TabsContent value="intuitive" className="mt-4">
              <VisualizationSection
                type="intuitive"
                title="Intuitive"
                svgContent={svgIntuitive}
                error={filteredIntuitiveError}
                isOpen={activeTab === "intuitive"}
                mwpValue={mwpValue}
                formulaValue={formulaValue}
                onEmbeddedSVGClick={onEmbeddedSVGClick}
                onEntityQuantityClick={onEntityQuantityClick}
                onNameClick={onNameClick}
                isPopupOpen={isPopupOpen}
                isDisabled={isDisabled}
              />
            </TabsContent>
          </>
        )}

        {/* Missing SVG content */}
        {missingSVGEntities.length > 0 && (
          <TabsContent value="missing-svg" className="mt-4">
            <MissingSVGSection
              missingSVGEntities={missingSVGEntities}
              onRegenerateAfterUpload={onRegenerateAfterUpload}
              onAllFilesUploaded={onAllFilesUploaded}
            />
          </TabsContent>
        )}
      </Tabs>
      
      {/* Hint input - hide when missing SVG tab is active */}
      {((svgFormal || svgIntuitive) && (
        (activeTab === 'formal' && !filteredFormalError) || 
        (activeTab === 'intuitive' && !filteredIntuitiveError)
      )) && (
        <div className="mt-4 text-left">
          <Textarea
            className="w-full ring-offset-background responsive-text-font-size"
            placeholder="Does not look as expected? Then add more hints about the relationships between the visual elements inside here ..."
            rows={3}
            spellCheck={false}
            value={hint}
            onChange={handleHintChange}
            onBlur={handleHintBlur}
            disabled={isDisabled}
          />
        </div>
      )}
    </div>
  );
});
