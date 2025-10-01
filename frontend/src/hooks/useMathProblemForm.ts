import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import type { FormData } from "@/schemas/validation";
import type { ComponentMapping } from "@/types/visualInteraction";
import type { ParsedOperation } from "@/utils/dsl-parser";
import { useHighlightingContext } from "@/contexts/HighlightingContext";

interface UseMathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: ComponentMapping) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  mwp?: string;
  formula?: string;
  hint?: string;
  saveInitialValues: (mwp: string, formula: string, hint: string) => void;
}

export const useMathProblemForm = ({
  onSuccess,
  onLoadingChange,
  mwp = "",
  formula = "",
  hint = "",
  saveInitialValues,
}: UseMathProblemFormProps) => {
  const [loading, setLoading] = useState(false);
  const { clearHighlighting } = useHighlightingContext();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mwp: mwp,
      formula: formula,
      hint: hint,
    },
  });

  // Update form values when initial values change (only for the two-column layout)
  useEffect(() => {
    if (mwp || formula || hint) {
      form.setValue("mwp", mwp);
      form.setValue("formula", formula);
      form.setValue("hint", hint);
    }
  }, [mwp, formula, hint, form]);


  const handleSubmit = async (data: FormData) => {
    clearHighlighting();
    setLoading(true);
    
    // Save the form values before generating (so they're preserved on abort)
    saveInitialValues(data.mwp, data.formula || "", data.hint || "");

    // Create abort controller for this request
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      setLoading(false);
    };
    
    onLoadingChange(true, abort);

    try {
      const result = await service.generateFromMathProblem(
        data.mwp, 
        data.formula,
        data.hint,
        controller.signal
      );
      onSuccess(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.parsedDSL!,
        result.formal_error || undefined,
        result.intuitive_error || undefined,
        result.missing_svg_entities,
        data.mwp,
        data.formula || "",
        result.componentMappings
      );
    } catch (error) {
      console.error('Generation failed:', error);
      // Only show toast if it's not an abort error
      if (error instanceof Error && !error.message.includes("Request was cancelled")) {
        const errorMessage = error.message || "An unknown error occurred";
        toast.error("Failed to generate visualizations", {
          description: errorMessage
        });
      }
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  };

  return {
    form,
    loading,
    handleSubmit: form.handleSubmit(handleSubmit),
  };
}; 