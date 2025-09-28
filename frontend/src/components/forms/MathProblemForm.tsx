import React from "react";
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
import type { ParsedOperation } from "@/utils/dsl-parser";

interface MathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  onReset: () => void;
  mwp?: string;
  formula?: string;
  hint?: string;
  saveInitialValues: (mwp: string, formula: string, hint: string) => void;
  rows?: number;
  highlightRanges?: Array<[number, number]>;
  hideSubmit?: boolean;
  largeFont?: boolean;
  showHint?: boolean;
  hintInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export const MathProblemForm = ({ 
  onSuccess, 
  onLoadingChange, 
  onReset,
  mwp = "",
  formula = "",
  hint = "",
  saveInitialValues,
  rows = 8,
  highlightRanges = [],
  hideSubmit = false,
  largeFont = false,
  showHint = false,
  hintInputRef,
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
    hint,
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
                  className={`w-full ${largeFont ? 'md:text-md md:leading-relaxed lg:text-l' : ''}`}
                  placeholder="Enter your math word problem…"
                  rows={rows}
                  spellCheck={false}
                  highlightRanges={highlightRanges}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
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
                  className={`w-full ${largeFont ? 'md:text-md lg:text-gl' : ''}`}
                  placeholder="Optional formula (e.g. 9 + 7 = 16)"
                  spellCheck={false}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showHint && (
          <FormField
            control={form.control}
            name="hint"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <textarea
                    className={`w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${largeFont ? 'md:text-md md:leading-relaxed lg:text-l' : ''}`}
                    placeholder="Add hints about the relationships between the visual elements ..."
                    rows={rows}
                    spellCheck={false}
                    {...field}
                    ref={(el) => {
                      if (hintInputRef) hintInputRef.current = el;
                      if (typeof field.ref === 'function') field.ref(el);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-center mt-6">
          {!loading && !hideSubmit && (
            <Button
              type="submit"
              size="lg"
              className="min-w-[200px] bg-primary text-primary-foreground"
            >
              Generate
            </Button>
          )}
        </div>
      </form>

      {error && <ErrorDisplay error={error} />}
    </Form>
  );
}; 