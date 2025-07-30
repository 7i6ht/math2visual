import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { resubmitSchema } from "@/schemas/validation";
import { apiService } from "@/services/api";
import type { ResubmitData } from "@/schemas/validation";

interface UseVisualLanguageFormProps {
  vl: string | null;
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string) => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onReset: () => void;
}

export const useVisualLanguageForm = ({
  vl,
  onSuccess,
  onError,
  onLoadingChange,
  onReset,
}: UseVisualLanguageFormProps) => {
  const form = useForm<ResubmitData>({
    resolver: zodResolver(resubmitSchema),
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

  const handleResubmit = async (data: ResubmitData) => {
    onError("");
    onLoadingChange(true);
    onReset();

    try {
      const result = await apiService.generateFromDSL(data.dsl);
      onSuccess(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.formal_error,
        result.intuitive_error
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      onError(errorMessage);
    } finally {
      onLoadingChange(false);
    }
  };

  return {
    form,
    handleResubmit: form.handleSubmit(handleResubmit),
  };
}; 