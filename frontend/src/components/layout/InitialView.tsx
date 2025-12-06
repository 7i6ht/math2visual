import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { SparklesLoading } from "@/components/ui/sparkles-loading";
import { SessionAnalyticsDisplay } from "@/components/ui/SessionAnalyticsDisplay";
import { HeroShell } from "./HeroShell";
import { trackInitialViewRender, isAnalyticsEnabled, getSessionId } from "@/services/analyticsTracker";
import type { useAppState } from "@/hooks/useAppState";

type Props = {
  appState: ReturnType<typeof useAppState>;
};

export function InitialView({ appState }: Props) {
  const { t } = useTranslation();
  const {
    setResults,
    setMpFormLoading,
    resetResults,
    mwp,
    formula,
    hint,
    saveInitialValues,
    mpFormLoading,
    handleAbort,
  } = appState;
  const analyticsEnabled = isAnalyticsEnabled();
  const sessionId = getSessionId();

  // Track initial view render
  useEffect(() => {
    if (analyticsEnabled) {
      trackInitialViewRender();
    }
  }, [analyticsEnabled]);

  return (
    <HeroShell
      title="Math2Visual"
      subtitle={t("app.subtitle")}
      floatingContent={analyticsEnabled ? <SessionAnalyticsDisplay sessionId={sessionId} /> : null}
    >
      <MathProblemForm
        onSuccess={setResults}
        onLoadingChange={(loading, abortFn) => {
          setMpFormLoading(loading, abortFn);
        }}
        onReset={resetResults}
        mwp={mwp}
        formula={formula}
        hint={hint}
        saveInitialValues={saveInitialValues}
        rows={5}
        hideSubmit={mpFormLoading}
        isSimplifiedView={true}
      />

      {mpFormLoading && (
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <SparklesLoading onAbort={handleAbort} showAbortButton={true} />
        </div>
      )}
    </HeroShell>
  );
}


