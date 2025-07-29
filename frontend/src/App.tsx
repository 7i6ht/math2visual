import './App.css';
import { MathProblemForm } from "@/components/forms/MathProblemForm";
import { VisualLanguageForm } from "@/components/forms/VisualLanguageForm";
import { VisualizationResults } from "@/components/visualization/VisualizationResults";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useVisualizationState } from "@/hooks/useVisualizationState";
import { useVisualizationForm } from "@/hooks/useVisualizationForm";
import { useResubmitForm } from "@/hooks/useResubmitForm";

function App() {
  const {
    vl,
    error,
    loading,
    svgFormal,
    svgIntuitive,
    formalError,
    intuitiveError,
    setLoading,
    setError,
    setResults,
    resetResults,
    resetErrors,
  } = useVisualizationState();

  const { form: mainForm, handleSubmit } = useVisualizationForm({
    onSuccess: setResults,
    onError: setError,
    onLoadingChange: setLoading,
    onReset: resetResults,
  });

  const { form: resubmitForm, handleResubmit } = useResubmitForm({
    vl,
    onSuccess: setResults,
    onError: setError,
    onLoadingChange: setLoading,
    onReset: resetErrors,
  });

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
          loading={loading}
        />

        {error && <ErrorDisplay error={error} />}

        {vl && (
          <VisualLanguageForm
            form={resubmitForm}
            onSubmit={handleResubmit}
            loading={loading}
          />
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