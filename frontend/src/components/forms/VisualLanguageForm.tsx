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
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Visual Language</h2>
        
        <Form {...form}>
          <form onSubmit={handleVLForm} className="space-y-4">
            <FormField
              control={form.control}
              name="dsl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SyntaxEditor
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full"
                      rows={15}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center">
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
    </div>
  );
}; 