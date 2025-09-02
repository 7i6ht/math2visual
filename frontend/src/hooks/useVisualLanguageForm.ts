import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { vlFormSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import type { VLFormData } from "@/schemas/validation";
import { DSLFormatter } from "@/utils/dsl-formatter";

interface UseVisualLanguageFormProps {
  vl: string | null;
  onSuccess: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: any) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
}

export const useVisualLanguageForm = ({
  vl,
  onSuccess,
  onLoadingChange,
}: UseVisualLanguageFormProps) => {
  const [error, setError] = useState<string | null>(null);

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

  const handleVLChange = async (dslValue: string) => {
    // Don't regenerate if the value is empty or hasn't changed
    if (!dslValue.trim() || dslValue === vl) {
      return;
    }

    setError(null);

    // Create abort controller for this request
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      setError("Update cancelled");
    };

    onLoadingChange(true, abort);

    try {
      // Minify the DSL (single line format)
      const minifiedDsl = DSLFormatter.minify(dslValue);
      const result = await service.generateFromDSL(minifiedDsl, controller.signal);
      onSuccess(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.formal_error || undefined,
        result.intuitive_error || undefined,
        result.missing_svg_entities,
        undefined, // mwp - not changing
        undefined, // formula - not changing
        result.component_mappings
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
    } finally {
      onLoadingChange(false);
    }
  };

  // Debounced change handler managed by the hook
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDebouncedChange = (value: string, delayMs = 800) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (value && value.trim() && value !== vl) {
        void handleVLChange(value);
      }
    }, delayMs);
  };

  return {
    form,
    error,
    handleVLChange,
    handleDebouncedChange,
  };
}; 