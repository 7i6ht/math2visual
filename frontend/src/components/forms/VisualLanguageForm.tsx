import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { GearLoading } from "@/components/ui/gear-loading";
import type { UseFormReturn } from "react-hook-form";
import type { ResubmitData } from "@/schemas/validation";

interface VisualLanguageFormProps {
  form: UseFormReturn<ResubmitData>;
  onSubmit: () => void;
  loading: boolean;
}

export const VisualLanguageForm = ({ form, onSubmit, loading }: VisualLanguageFormProps) => {
  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Visual Language</h2>
        
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="dsl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      className="w-full font-mono text-sm"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center">
              {loading ? (
                <GearLoading message="Updating" />
              ) : (
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
      </div>
    </div>
  );
}; 