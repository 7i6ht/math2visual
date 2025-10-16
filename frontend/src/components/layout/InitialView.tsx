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
    <div className="w-full px-3 py-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 4xl:px-24 5xl:px-32">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)]">
        <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6 xl:space-y-8 2xl:space-y-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 lg:gap-6 xl:gap-8 2xl:gap-10 mb-3 sm:mb-4 lg:mb-6 xl:mb-8 2xl:mb-10">
            <ResponsiveLogo className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 3xl:w-28 3xl:h-28 4xl:w-32 4xl:h-32 5xl:w-36 5xl:h-36" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl 3xl:text-9xl 4xl:text-[10rem] 5xl:text-[12rem] font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Math2Visual
            </h1>
          </div>
          <p className="text-muted-foreground text-lg sm:text-xl md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl 3xl:text-5xl 4xl:text-6xl 5xl:text-7xl max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl 3xl:max-w-8xl 4xl:max-w-9xl 5xl:max-w-[90rem] mx-auto leading-relaxed font-medium px-2 sm:px-0">
            Generating Pedagogically Meaningful Visuals for Math Word Problems
          </p>
        </div>

        <div className="w-full max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl 3xl:max-w-8xl 4xl:max-w-9xl 5xl:max-w-[90rem] mt-4 sm:mt-6 lg:mt-8 xl:mt-10 2xl:mt-12 mb-4 sm:mb-6 lg:mb-8 xl:mb-10 2xl:mb-12 px-2 sm:px-0">
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


