import { Button } from "@/components/ui/button";
import { SyntaxEditor } from "@/components/ui/syntax-editor";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useVisualLanguageForm } from "@/hooks/useVisualLanguageForm";

interface VisualLanguageFormProps {
  vl: string | null;
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[]) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  onReset: () => void;
}

export const VisualLanguageForm = ({ 
  vl,
  onSuccess,
  onLoadingChange,
  onReset
}: VisualLanguageFormProps) => {
  const { 
    form, 
    error,
    loading,
    handleVLForm,
  } = useVisualLanguageForm({
    vl,
    onSuccess,
    onLoadingChange,
    onReset,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-xl font-semibold mb-3 flex-shrink-0">Visual Language</h2>
      
      <Form {...form}>
        <form onSubmit={handleVLForm} className="flex flex-col min-h-0 flex-1">
          <FormField
            control={form.control}
            name="dsl"
            render={({ field }) => (
              <FormItem className="flex-1 flex flex-col min-h-0">
                <FormControl className="flex-1 min-h-0">
                  <SyntaxEditor
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full"
                    height="100%"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-center mt-4 flex-shrink-0">
            {!loading && (
              <Button
                type="submit"
                variant="secondary"
                className="min-w-[200px]"
              >
                Resubmit Visualization
              </Button>
            )}
          </div>
        </form>
      </Form>

      {error && <ErrorDisplay error={error} />}
    </div>
  );
}; 