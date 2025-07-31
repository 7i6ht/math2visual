import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema } from "@/schemas/validation";
import { apiService } from "@/services/api";
import type { FormData } from "@/schemas/validation";

interface UseMathProblemFormProps {
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string) => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onReset: () => void;
  onAbortControllerChange: (controller: AbortController) => void;
}

export const useMathProblemForm = ({
  onSuccess,
  onError,
  onLoadingChange,
  onReset,
  onAbortControllerChange,
}: UseMathProblemFormProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mwp: "",
      formula: "",
    },
  });

  const handleSubmit = async (data: FormData) => {
    onError("");
    onLoadingChange(true);
    onReset();

    // Create abort controller for this request
    const abortController = new AbortController();
    onAbortControllerChange(abortController);

    try {
      const result = await apiService.generateFromMathProblem(
        data.mwp, 
        data.formula, 
        abortController.signal
      );
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
    handleSubmit: form.handleSubmit(handleSubmit),
  };
}; 