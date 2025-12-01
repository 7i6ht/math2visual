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
import { trackMWPType, trackFormulaType, trackHintType, isAnalyticsEnabled } from "@/services/analyticsTracker";
import type { ParsedOperation } from "@/utils/dsl-parser";
import type { ComponentMapping } from "@/types/visualInteraction";
import { useHighlightingContext } from "@/contexts/HighlightingContext";

interface MathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, hint?: string, componentMappings?: ComponentMapping, hasParseError?: boolean) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  mwp?: string;
  formula?: string;
  hint?: string;
  saveInitialValues: (mwp: string, formula: string, hint: string) => void;
  rows?: number;
  hideSubmit?: boolean;
  onReset?: () => void;
  onRegenerateOnBlur?: (fieldName: 'mwp' | 'formula' | 'hint', currentMwp: string, currentFormula: string, currentHint: string) => void;
  isDisabled?: boolean;
  showHintInput?: boolean;
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
  onRegenerateOnBlur,
  isDisabled = false,
  showHintInput = false,
}: MathProblemFormProps) => {
  const { mwpHighlightRanges, formulaHighlightRanges, clearHighlightingState } = useHighlightingContext();
  const analyticsEnabled = isAnalyticsEnabled();

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
    }, []);

  const formulaChangeHandler = useCallback((onChange: (e: React.ChangeEvent<HTMLInputElement>) => void) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
      trackFormulaType();
    }, []);

  const handleHintChange = useCallback((onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void) => 
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e);
      trackHintType();
    }, [analyticsEnabled]);

  const handleMwpBlur = useCallback(() => {
    // Trigger regeneration if mwp has content and differs from initial value
    const currentMwp = form.getValues('mwp');
    const currentFormula = form.getValues('formula') || '';
    const currentHint = form.getValues('hint') || '';
    if (currentMwp.trim() && currentMwp !== mwp && onRegenerateOnBlur) {
      onRegenerateOnBlur('mwp', currentMwp, currentFormula, currentHint);
    }
  }, [form, mwp, onRegenerateOnBlur]);

  const handleFormulaBlur = useCallback(() => {
    // Trigger regeneration if formula has content and differs from initial value
    const currentMwp = form.getValues('mwp');
    const currentFormula = form.getValues('formula') || '';
    const currentHint = form.getValues('hint') || '';
    if (currentFormula?.trim() && currentFormula !== formula && onRegenerateOnBlur) {
      onRegenerateOnBlur('formula', currentMwp, currentFormula, currentHint);
    }
  }, [form, formula, onRegenerateOnBlur]);

  const handleHintBlur = useCallback(() => {
    // Trigger regeneration if hint has content and differs from initial value
    const currentMwp = form.getValues('mwp');
    const currentFormula = form.getValues('formula') || '';
    const currentHint = form.getValues('hint') || '';
    if (currentHint?.trim() && currentHint !== hint && onRegenerateOnBlur) {
      onRegenerateOnBlur('hint', currentMwp, currentFormula, currentHint);
    }
  }, [form, hint, onRegenerateOnBlur]);

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
                  disabled={isDisabled}
                  {...field}
                  onBlur={() => {
                    field.onBlur();
                    handleMwpBlur();
                  }}
                  {...(analyticsEnabled ? {onChange: mwpChangeHandler(field.onChange)} : {})}
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
                  disabled={isDisabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  {...field}
                  onBlur={() => {
                    field.onBlur();
                    handleFormulaBlur();
                  }}
                  {...(analyticsEnabled ? {onChange: formulaChangeHandler(field.onChange)} : {})}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hint input - show when visualizations are present */}
        {showHintInput && (
          <FormField
            control={form.control}
            name="hint"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    className="w-full ring-offset-background responsive-text-font-size"
                    placeholder="Does not look as expected? Then add more hints about the relationships between the visual elements inside here ..."
                    rows={6.5}
                    spellCheck={false}
                    disabled={isDisabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                    {...field}
                    onBlur={() => {
                      field.onBlur();
                      handleHintBlur();
                    }}
                    {...(analyticsEnabled ? {onChange: handleHintChange(field.onChange)} : {})}
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