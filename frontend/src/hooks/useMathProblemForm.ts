import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { formSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import type { FormData } from "@/schemas/validation";

interface UseMathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: any) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  onReset: () => void;
  mwp?: string;
  formula?: string;
  saveInitialValues: (mwp: string, formula: string) => void;
}

export const useMathProblemForm = ({
  onSuccess,
  onLoadingChange,
  onReset,
  mwp = "",
  formula = "",
  saveInitialValues,
}: UseMathProblemFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mwp: mwp,
      formula: formula,
    },
  });

  // Update form values when initial values change (only for the two-column layout)
  useEffect(() => {
    if (mwp || formula) {
      form.setValue("mwp", mwp);
      form.setValue("formula", formula);
    }
  }, [mwp, formula, form]);

  const handleSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    
    // Save the form values before resetting (so they're preserved on abort)
    saveInitialValues(data.mwp, data.formula || "");
    
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
        controller.signal
      );
      onSuccess(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.formal_error || undefined,
        result.intuitive_error || undefined,
        result.missing_svg_entities,
        data.mwp,
        data.formula || "",
        result.component_mappings
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