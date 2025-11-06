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

interface HorizontalMathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  mwp?: string;
  formula?: string;
  hint?: string;
  saveInitialValues: (mwp: string, formula: string, hint: string) => void;
  onReset?: () => void;
}

export const HorizontalMathProblemForm = ({ 
  onSuccess, 
  onLoadingChange, 
  mwp = "",
  formula = "",
  hint = "",
  saveInitialValues,
}: HorizontalMathProblemFormProps) => {
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

  const mwpChangeHandler = useCallback((onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void) => 
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e);
      trackMWPType();
    }, [trackMWPType]);

  const formulaChangeHandler = useCallback((onChange: (e: React.ChangeEvent<HTMLInputElement>) => void) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
      trackFormulaType();
    }, [trackFormulaType]);

  const hintChangeHandler = useCallback((onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void) => 
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e);
      trackHintType();
    }, [trackHintType]);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="w-full" onClick={handleFormClick}>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_auto] gap-3 md:gap-4 3xl:gap-6 4xl:gap-8 5xl:gap-10 items-start">
          {/* MWP Input */}
          <FormField
            control={form.control}
            name="mwp"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-background px-1 text-sm text-muted-foreground z-10">
                    Math word problem:
                  </label>
                  <FormControl>
                      <HighlightableTextarea
                        className={"w-full responsive-text-font-size"}
                        placeholder="Enter your math word problem…"
                        rows={4}
                        spellCheck={false}
                        style={{ minHeight: '100px' }}
                      highlightRanges={mwpHighlightRanges}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      {...field}
                      {...(isAnalyticsEnabled ? {onChange: mwpChangeHandler(field.onChange)} : {})}
                    />
                  </FormControl>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Hint Input */}
          <FormField
            control={form.control}
            name="hint"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-background px-1 text-sm text-muted-foreground z-10">
                    Optional hints:
                  </label>
                  <FormControl>
                    <Textarea
                      className={"w-full ring-offset-background responsive-text-font-size"}
                      placeholder="Add hints about the relationships between the visual elements ..."
                      rows={4}
                      spellCheck={false}
                      style={{ minHeight: '100px' }}
                      {...field}
                      {...(isAnalyticsEnabled ? {onChange: hintChangeHandler(field.onChange)} : {})}
                    />
                  </FormControl>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Formula Input + Generate Button Stack */}
          <div className="flex flex-col gap-3">
            {/* Formula Input */}
            <FormField
              control={form.control}
              name="formula"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-background px-1 text-sm text-muted-foreground z-10">
                      Optional formula:
                    </label>
                    <FormControl>
                      <HighlightableInput
                        className={"w-full responsive-text-font-size"}
                        placeholder="9 + 7 = 16"
                        spellCheck={false}
                        highlightRanges={formulaHighlightRanges}
                        {...field}
                        {...(isAnalyticsEnabled ? {onChange: formulaChangeHandler(field.onChange)} : {})}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {/* Generate Button */}
            <div className="flex-1 flex items-end">
              {!loading && (
                <Button
                  type="submit"
                  className="w-full bg-primary !text-primary-foreground !responsive-text-font-size px-6 lg:px-8 py-6"
                >
                  Generate
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};

