import { ResponsiveLogo } from "@/components/ui/ResponsiveLogo";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { GearLoading } from "@/components/ui/gear-loading";
import type { useAppState } from "@/hooks/useAppState";

type Props = {
  appState: ReturnType<typeof useAppState>;
};

export function InitialView({ appState }: Props) {
  const {
    setResults,
    setMpFormLoading,
    resetResults,
    mwp,
    formula,
    saveInitialValues,
    mpFormLoading,
    handleAbort,
  } = appState;

  return (
    <div className="w-full px-4 py-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-16 4xl:px-16">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <ResponsiveLogo className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl 3xl:text-8xl 4xl:text-9xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Math2Visual
            </h1>
          </div>
          <p className="text-muted-foreground text-xl lg:text-2xl xl:text-3xl 3xl:text-4xl max-w-4xl lg:max-w-5xl xl:max-w-6xl 3xl:max-w-7xl mx-auto leading-relaxed font-medium">
            Generating Pedagogically Meaningful Visuals for Math Word Problems
          </p>
        </div>

        <div className="w-full max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl 3xl:max-w-8xl mt-6 mb-6">
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
    </div>
  );
}


