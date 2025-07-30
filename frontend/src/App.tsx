import './App.css';
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { ErrorDisplay } from "@/components/ui/error-display";
import { GearLoading } from "@/components/ui/gear-loading";
import { Toaster } from "@/components/ui/sonner";
import { useMath2VisualState } from "@/hooks/useMath2VisualState";
import { useMathProblemForm } from "@/hooks/useMathProblemForm";
import { useVisualLanguageForm } from "@/hooks/useVisualLanguageForm";

function App() {
  const {
    vl,
    error,
    resubmitLoading,
    mainFormLoading,
    svgFormal,
    svgIntuitive,
    formalError,
    intuitiveError,
    setMainFormLoading,
    setResubmitLoading,
    setError,
    setResults,
    resetResults,
    resetVisuals,
  } = useMath2VisualState();

  const { form: mathProblemForm, handleSubmit: handleMathProblemSubmit } = useMathProblemForm({
    onSuccess: setResults,
    onError: setError,
    onLoadingChange: setMainFormLoading,
    onReset: resetResults,
  });

  const { form: visualLanguageForm, handleResubmit: handleVisualLanguageSubmit } = useVisualLanguageForm({
    vl,
    onSuccess: setResults,
    onError: setError,
    onLoadingChange: setResubmitLoading,
    onReset: resetVisuals,
  });

  // Determine if any loading is happening and what message to show
  const isLoading = mainFormLoading || resubmitLoading;
  const loadingMessage = mainFormLoading ? "Generating..." : "Updating...";

  return (
    <>
      <div className="min-h-screen w-full p-8 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Math2Visual</h1>
          <p className="text-muted-foreground">Enter your math word problem to generate visual representations</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <MathProblemForm 
            form={mathProblemForm}
            onSubmit={handleMathProblemSubmit}
            loading={mainFormLoading}
          />

          {error && <ErrorDisplay error={error} />}

          {vl && (
            <VisualLanguageForm
              form={visualLanguageForm}
              onSubmit={handleVisualLanguageSubmit}
              loading={resubmitLoading}
            />
          )}

          {isLoading && (
            <div className="mt-8">
              <GearLoading message={loadingMessage} />
            </div>
          )}
        </div>

        <VisualizationResults
          svgFormal={svgFormal}
          formalError={formalError}
          svgIntuitive={svgIntuitive}
          intuitiveError={intuitiveError}
        />
      </div>
      <Toaster />
    </>
  );
}

export default App;