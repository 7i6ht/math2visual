import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { formSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import type { FormData } from "@/schemas/validation";
import type { ComponentMapping } from "@/types/visualInteraction";
import type { ParsedOperation } from "@/utils/dsl-parser";

interface UseMathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: ComponentMapping) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  onReset: () => void;
  mwp?: string;
  formula?: string;
  hint?: string;
  saveInitialValues: (mwp: string, formula: string, hint: string) => void;
}

export const useMathProblemForm = ({
  onSuccess,
  onLoadingChange,
  onReset,
  mwp = "",
  formula = "",
  hint = "",
  saveInitialValues,
}: UseMathProblemFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
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
    setError(null);
    setLoading(true);
    
    // Save the form values before resetting (so they're preserved on abort)
    saveInitialValues(data.mwp, data.formula || "", data.hint || "");
    
    onReset();

    // Create abort controller for this request
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      setLoading(false);
      setError("Generation cancelled");
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
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  };

  return {
    form,
    error,
    loading,
    handleSubmit: form.handleSubmit(handleSubmit),
  };
}; 