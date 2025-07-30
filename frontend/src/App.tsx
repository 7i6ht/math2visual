import './App.css';
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { ErrorDisplay } from "@/components/ui/error-display";
import { GearLoading } from "@/components/ui/gear-loading";
import { useVisualizationState } from "@/hooks/useVisualizationState";
import { useVisualizationForm } from "@/hooks/useVisualizationForm";
import { useResubmitForm } from "@/hooks/useResubmitForm";

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
  } = useVisualizationState();

  const { form: mainForm, handleSubmit } = useVisualizationForm({
    onSuccess: setResults,
    onError: setError,
    onLoadingChange: setMainFormLoading,
    onReset: resetResults,
  });

  const { form: resubmitForm, handleResubmit } = useResubmitForm({
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
    <div className="min-h-screen w-full p-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Math2Visual</h1>
        <p className="text-muted-foreground">Enter your math word problem to generate visual representations</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <MathProblemForm 
          form={mainForm}
          onSubmit={handleSubmit}
          loading={mainFormLoading}
        />

        {error && <ErrorDisplay error={error} />}

        {vl && (
          <VisualLanguageForm
            form={resubmitForm}
            onSubmit={handleResubmit}
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
  );
}

export default App;