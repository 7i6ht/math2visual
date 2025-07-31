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
    abortMainRequest,
    abortResubmitRequest,
    setMainAbortController,
    setResubmitAbortController,
  } = useMath2VisualState();

  const { form: mathProblemForm, handleSubmit: handleMathProblemSubmit } = useMathProblemForm({
    onSuccess: setResults,
    onError: setError,
    onLoadingChange: setMainFormLoading,
    onReset: resetResults,
    onAbortControllerChange: setMainAbortController,
  });

  const { form: visualLanguageForm, handleResubmit: handleVisualLanguageSubmit } = useVisualLanguageForm({
    vl,
    onSuccess: setResults,
    onError: setError,
    onLoadingChange: setResubmitLoading,
    onReset: resetVisuals,
    onAbortControllerChange: setResubmitAbortController,
  });

  // Determine if any loading is happening and what message to show
  const isLoading = mainFormLoading || resubmitLoading;
  const loadingMessage = mainFormLoading ? "Generating..." : "Updating...";
  const abortHandler = mainFormLoading ? abortMainRequest : abortResubmitRequest;

  return (
    <>
      <div className="min-h-screen w-full p-8 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="/math2visual-logo.svg" 
              alt="Math2Visual Logo" 
              className="w-10 h-10"
            />
            <h1 className="text-4xl font-bold">Math2Visual</h1>
          </div>
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
              <GearLoading 
                message={loadingMessage} 
                onAbort={abortHandler}
                showAbortButton={true}
              />
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