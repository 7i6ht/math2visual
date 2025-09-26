import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";

type Props = {
  appState: any;
  dslHighlightRanges: any;
  mwpHighlightRanges: any;
  formattedDSL?: string | null;
  onVLResult: any;
  onVLLoadingChange: any;
};

export function LeftPanel({
  appState,
  dslHighlightRanges,
  mwpHighlightRanges,
  formattedDSL,
  onVLResult,
  onVLLoadingChange,
}: Props) {
  return (
    <div className="flex flex-col space-y-8 xl:sticky xl:top-6 xl:h:[calc(100vh-3rem)] xl:z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
        <div className="space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <ResponsiveLogo className="w-8 h-8 sm:w-10 sm:h-10" />
              <h1 className="text-2xl sm:text-3xl font-bold">Math2Visual</h1>
            </div>
          </div>

          <MathProblemForm
            onSuccess={appState.setResults}
            onLoadingChange={(loading, abortFn) => {
              appState.setMpFormLoading(loading, abortFn);
            }}
            onReset={appState.resetResults}
            mwp={appState.mwp}
            formula={appState.formula}
            saveInitialValues={appState.saveInitialValues}
            rows={8}
            highlightRanges={mwpHighlightRanges}
            hideSubmit={false}
          />
        </div>

        <div className="flex flex-col min-h-[300px] md:min_h-[400px] xl:min-h-0">
          {formattedDSL && (
            <VisualLanguageForm
              onResult={onVLResult}
              onLoadingChange={onVLLoadingChange}
              highlightRanges={dslHighlightRanges}
            />
          )}
        </div>
      </div>
    </div>
  );
}


