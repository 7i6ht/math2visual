import { Button } from "@/components/ui/button";
import { HighlightableTextarea } from "@/components/ui/highlightable-textarea";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useMathProblemForm } from "@/hooks/useMathProblemForm";

interface MathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  onReset: () => void;
  mwp?: string;
  formula?: string;
  saveInitialValues: (mwp: string, formula: string) => void;
  rows?: number;
  highlightRanges?: Array<[number, number]>;
  hideSubmit?: boolean;
  largeFont?: boolean;
}

export const MathProblemForm = ({ 
  onSuccess, 
  onLoadingChange, 
  onReset,
  mwp = "",
  formula = "",
  saveInitialValues,
  rows = 8,
  highlightRanges = [],
  hideSubmit = false,
  largeFont = false
}: MathProblemFormProps) => {
  const { 
    form, 
    error,
    loading,
    handleSubmit,
  } = useMathProblemForm({
    onSuccess,
    onLoadingChange,
    onReset,
    mwp,
    formula,
    saveInitialValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="mwp"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <HighlightableTextarea
                  className={`w-full ${largeFont ? 'text-2xl leading-relaxed' : ''}`}
                  placeholder="Enter your math word problem…"
                  rows={rows}
                  spellCheck={false}
                  highlightRanges={highlightRanges}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="formula"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  className={`w-full ${largeFont ? 'text-xl' : ''}`}
                  placeholder="Optional formula (e.g. 9 + 7 = 16)"
                  spellCheck={false}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-center mt-6">
          {!loading && !hideSubmit && (
            <Button
              type="submit"
              size="lg"
              className="min-w-[200px] bg-primary text-primary-foreground"
            >
              Generate Visualization
            </Button>
          )}
        </div>
      </form>

      {error && <ErrorDisplay error={error} />}
    </Form>
  );
}; 