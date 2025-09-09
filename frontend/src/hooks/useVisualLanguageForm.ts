import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { vlFormSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import { DSLFormatter } from "@/utils/dsl-formatter";
import { toast } from "sonner";
import type { VLFormData } from "@/schemas/validation";

interface UseVisualLanguageFormProps {
  vl: string | null;
  onResult: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: any) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
}

export const useVisualLanguageForm = ({
  vl,
  onResult,
  onLoadingChange,
}: UseVisualLanguageFormProps) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<VLFormData>({
    resolver: zodResolver(vlFormSchema),
    defaultValues: {
      dsl: "",
    },
  });

  // Update form value when vl changes
  useEffect(() => {
    if (vl !== null) {
      // Ensure DSL is formatted on load/prop change (frontend owns formatting now)
      try {
        const formatter = new DSLFormatter();
        const { formattedDSL } = formatter.processAndFormatDSL(vl);
        form.setValue("dsl", formattedDSL);
      } catch {
        form.setValue("dsl", vl);
      }
    }
  }, [vl, form]);

  const handleVLChange = async (dslValue: string) => {
    // Don't regenerate if the value is empty or hasn't changed
    if (!dslValue.trim() || dslValue === vl) {
      return;
    }

    // Create abort controller for this request
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      toast.info('Generation cancelled');
    };

    onLoadingChange(true, abort);

    try {
      // Minify the DSL (single line) for backend generation
      const minifiedDsl = DSLFormatter.minify(dslValue);
      const result = await service.generateFromDSL(minifiedDsl, controller.signal);

      // Choose the DSL to display (keep previous if generation errored)
      const visualLanguageToUse = (result.formal_error || result.intuitive_error)
        ? (vl || "")
        : result.visual_language;

      // Pass results up with service-provided mappings
      onResult(
        visualLanguageToUse,
        result.svg_formal,
        result.svg_intuitive,
        result.formal_error,
        result.intuitive_error,
        result.missing_svg_entities,
        undefined, // mwp - unchanged
        undefined, // formula - unchanged
        result.componentMappings
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Generation cancelled');
      } else {
        toast.error(error instanceof Error ? error.message : "An error occurred");
      }
    } finally {
      onLoadingChange(false);
    }
  };

  // Debounced change handler managed by the hook
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
    handleDebouncedChange,
  };
}; 