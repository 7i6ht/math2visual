import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { vlFormSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import type { VLFormData } from "@/schemas/validation";
import { DSLFormatter } from "@/utils/dsl-formatter";


interface UseVisualLanguageFormProps {
  vl: string | null;
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], initialMWP?: string, initialFormula?: string, componentMappings?: any) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  onReset: () => void;
}

export const useVisualLanguageForm = ({
  vl,
  onSuccess,
  onLoadingChange,
  onReset,
}: UseVisualLanguageFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<VLFormData>({
    resolver: zodResolver(vlFormSchema),
    defaultValues: {
      dsl: "",
    },
  });

  // Update form value when vl changes
  useEffect(() => {
    if (vl !== null) {
      form.setValue("dsl", vl);
    }
  }, [vl, form]);

  const handleVLForm = async (data: VLFormData) => {
    setError(null);
    setLoading(true);
    // Don't reset visuals when regenerating - keep them visible during regeneration
    // onReset();

    // Create abort controller for this request
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      setLoading(false);
      setError("Update cancelled");
    };
    
    onLoadingChange(true, abort);

    try {
      // Minify the DSL (single line format)
      const minifiedDsl = DSLFormatter.minify(data.dsl);
      const result = await service.generateFromDSL(minifiedDsl, controller.signal);
      onSuccess(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.formal_error || undefined,
        result.intuitive_error || undefined,
        result.missing_svg_entities,
        undefined, // initialMWP - not changing
        undefined, // initialFormula - not changing
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
    handleVLForm: form.handleSubmit(handleVLForm),
  };
}; 