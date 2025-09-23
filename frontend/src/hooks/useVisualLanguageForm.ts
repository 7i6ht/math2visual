import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { vlFormSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import { DSLFormatter } from "@/utils/dsl-formatter";
import { parseWithErrorHandling } from "@/utils/dsl-parser";
import { toast } from "sonner";
import { useDSLContext } from "@/contexts/DSLContext";
import type { VLFormData } from "@/schemas/validation";
import type { ComponentMapping } from "@/types/visualInteraction";
import type { ParsedOperation } from "@/utils/dsl-parser";

interface UseVisualLanguageFormProps {
  onResult: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, currentParsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: ComponentMapping) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
}

export const useVisualLanguageForm = ({
  onResult,
  onLoadingChange,
}: UseVisualLanguageFormProps) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { formattedDSL, parsedDSL } = useDSLContext();

  const form = useForm<VLFormData>({
    resolver: zodResolver(vlFormSchema),
    defaultValues: {
      dsl: "",
    },
  });

  // Update form value when formattedDSL changes
  useEffect(() => {
    if (formattedDSL !== null) {
      // Ensure DSL is formatted on load/prop change (frontend owns formatting now)
      const formatter = new DSLFormatter();
      const parsed = parseWithErrorHandling(formattedDSL);
      if (parsed) {
        const formatted = formatter.formatWithRanges(parsed);
        form.setValue("dsl", formatted);
      } else {
        form.setValue("dsl", formattedDSL);
      }
    }
  }, [formattedDSL, form]);

  const handleVLChange = async (dslValue: string) => {
    // Don't regenerate if the value is empty or hasn't changed
    if (!dslValue.trim() || dslValue === formattedDSL) {
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
      const result = await service.generateFromDSL(dslValue, controller.signal);

      // Choose the DSL to display (keep previous if generation errored)
      const visualLanguageToUse = (result.formal_error || result.intuitive_error)
        ? (formattedDSL || "")
        : result.visual_language;

      // Pass results up with service-provided mappings
      onResult(
        visualLanguageToUse,
        result.svg_formal,
        result.svg_intuitive,
        result.parsedDSL!,
        parsedDSL!, // current parsed DSL for comparison
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
      if (value && value.trim() && value !== formattedDSL) {
        void handleVLChange(value);
      }
    }, delayMs);
  };

  return {
    form,
    handleDebouncedChange,
  };
}; 