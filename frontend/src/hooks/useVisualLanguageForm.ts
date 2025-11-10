import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useEffect } from "react";
import { vlFormSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import { trackFormSubmit, trackError, isAnalyticsEnabled } from "@/services/analyticsTracker";
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
  // Use reset() instead of setValue() to ensure the form field updates even when
  // the context value appears unchanged (e.g., regenerating same DSL after manual edit)
  useEffect(() => {
    if (formattedDSL !== null) {
      form.reset({ dsl: formattedDSL }, { keepDefaultValues: false });
    }
  }, [formattedDSL, form]);

  const handleVLChange = async (dslValue: string) => {
    // Don't regenerate if the value is empty or hasn't changed
    if (!dslValue.trim()) {
      return;
    }

    // Track form submission
    if (isAnalyticsEnabled()) {
      trackFormSubmit('visual_language_form_change', dslValue);
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

      // Choose the DSL to display (keep previous only if parse error)
      const hasParseError = (result.formal_error && /Visual Language parse error/i.test(result.formal_error)) || 
                           (result.intuitive_error && /Visual Language parse error/i.test(result.intuitive_error));
      
      const visualLanguageToUse = hasParseError
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
      if (error instanceof Error && error.name !== 'AbortError') {
        // Track error
        if (isAnalyticsEnabled()) {
          trackError('dsl_generation_failed', error instanceof Error ? error.message : "An error occurred");
        }
        
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
      void handleVLChange(value);
    }, delayMs);
  };

  return {
    form,
    handleDebouncedChange,
  };
}; 