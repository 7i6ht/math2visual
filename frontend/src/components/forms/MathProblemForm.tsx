import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { HighlightableTextarea } from "@/components/ui/highlightable-textarea";
import { HighlightableInput } from "@/components/ui/highlightable-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useMathProblemForm } from "@/hooks/useMathProblemForm";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { ParsedOperation } from "@/utils/dsl-parser";
import { useHighlightingContext } from "@/contexts/HighlightingContext";

interface MathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  mwp?: string;
  formula?: string;
  hint?: string;
  saveInitialValues: (mwp: string, formula: string, hint: string) => void;
  rows?: number;
  hideSubmit?: boolean;
  showHint?: boolean;
  hintInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onReset?: () => void;
}

export const MathProblemForm = ({ 
  onSuccess, 
  onLoadingChange, 
  mwp = "",
  formula = "",
  hint = "",
  saveInitialValues,
  rows = 8,
  hideSubmit = false,
  showHint = false,
  hintInputRef,
}: MathProblemFormProps) => {
  const { mwpHighlightRanges, formulaHighlightRanges, clearHighlightingState } = useHighlightingContext();
  const { trackMWPType, trackFormulaType, trackHintType, isAnalyticsEnabled } = useAnalytics();

  const handleFormClick = useCallback(() => {
    clearHighlightingState();
  }, [clearHighlightingState]);

  const { 
    form, 
    loading,
    handleSubmit,
  } = useMathProblemForm({
    onSuccess,
    onLoadingChange,
    mwp,
    formula,
    hint,
    saveInitialValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 xl:space-y-5 2xl:space-y-6 3xl:space-y-7 4xl:space-y-8 5xl:space-y-9 6xl:space-y-10 7xl:space-y-11" onClick={handleFormClick}>
        <FormField
          control={form.control}
          name="mwp"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <HighlightableTextarea
                  className={"w-full responsive-text-font-size"}
                  placeholder="Enter your math word problem…"
                  rows={rows}
                  spellCheck={false}
                  highlightRanges={mwpHighlightRanges}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  {...field}
                  {...(isAnalyticsEnabled ? {onChange: (e) => {
                    field.onChange(e);
                    if (isAnalyticsEnabled) {
                      trackMWPType();
                    }
                  }} : {})}
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
                <HighlightableInput
                  className={"w-full responsive-text-font-size"}
                  placeholder="9 + 7 = 16"
                  spellCheck={false}
                  highlightRanges={formulaHighlightRanges}
                  {...field}
                  {...(isAnalyticsEnabled ? {onChange: (e) => {
                    field.onChange(e);
                    if (isAnalyticsEnabled) {
                      trackFormulaType();
                    }
                  }} : {})}
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
                  <Textarea
                    className={"w-full ring-offset-background responsive-text-font-size"}
                    placeholder="Add more hints about the relationships between the visual elements ..."
                    rows={rows}
                    spellCheck={false}
                    {...field}
                    {...(isAnalyticsEnabled ? {onChange: (e) => {
                      field.onChange(e);
                      if (isAnalyticsEnabled) {
                        trackHintType();
                      }
                    }} : {})}
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
              className="min-w-[200px] bg-primary !text-primary-foreground !responsive-text-font-size button-responsive-size px-6 py-3 md:px-8 md:py-4 lg:px-10 lg:py-5 xl:px-12 xl:py-6"
            >
              Generate
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}; 