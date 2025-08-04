import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, isSvgMissing?: boolean, missingSvgName?: string) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  onReset: () => void;
}

export const MathProblemForm = ({ 
  onSuccess, 
  onLoadingChange, 
  onReset
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
                <Textarea
                  className="w-full"
                  placeholder="Enter your math word problem…"
                  rows={4}
                  spellCheck={false}
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
                  className="w-full"
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
          {!loading && (
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