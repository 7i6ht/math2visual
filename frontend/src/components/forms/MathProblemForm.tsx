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
import type { UseFormReturn } from "react-hook-form";
import type { FormData } from "@/schemas/validation";

interface MathProblemFormProps {
  form: UseFormReturn<FormData>;
  onSubmit: () => void;
  loading: boolean;
}

export const MathProblemForm = ({ form, onSubmit, loading }: MathProblemFormProps) => {
  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
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
    </Form>
  );
}; 