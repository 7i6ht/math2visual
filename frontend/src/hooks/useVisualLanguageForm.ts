import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useEffect } from "react";
import { vlFormSchema } from "@/schemas/validation";
import { generationService as service } from "@/api_services/generation";
import { trackFormSubmit, trackError, isAnalyticsEnabled } from "@/services/analyticsTracker";
import { toast } from "sonner";
import { useDSLContext } from "@/contexts/DSLContext";
import { useHighlightingContext } from "@/contexts/HighlightingContext";
import type { VLFormData } from "@/schemas/validation";
import type { ComponentMapping } from "@/types/visualInteraction";
import type { ParsedOperation } from "@/utils/dsl-parser";
import { parseWithErrorHandling } from "@/utils/dsl-parser";
import { detectDSLChanges, updateMWPInput } from "@/lib/dsl-utils";

interface UseVisualLanguageFormProps {
  onResult: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: ComponentMapping, hasParseError?: boolean) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  mwp: string;
  formula: string | null;
}

export const useVisualLanguageForm = ({
  onResult,
  onLoadingChange,
  mwp,
  formula,
}: UseVisualLanguageFormProps) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { formattedDSL, parsedDSL } = useDSLContext();
  const { setMwpHighlightRanges, setFormulaHighlightRanges } = useHighlightingContext();

  const form = useForm<VLFormData>({
    resolver: zodResolver(vlFormSchema),
    defaultValues: {
      dsl: "",
    },
  });

  // Update form value when formattedDSL changes
  useEffect(() => {
    if (formattedDSL !== null) {
      form.setValue("dsl", formattedDSL);
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

    // Validate DSL on frontend before sending to backend
    const validatedParsedDSL = parseWithErrorHandling(dslValue);
    if (!validatedParsedDSL) {
      // Parse error - show error state without making API call
      toast.error('Visual Language syntax error. Please check your input.');
      
      // Show parse error in UI
      onResult(
        dslValue,
        null,
        null,
        { operation: 'unknown', entities: [] }, // Empty but valid ParsedOperation for parse error case
        'Visual Language parse error.',
        undefined,
        [],
        undefined,
        undefined,
        undefined,
        true // hasParseError
      );
      
      // Track error
      if (isAnalyticsEnabled()) {
        trackError('dsl_parse_error_frontend', 'Invalid DSL syntax');
      }
      
      return;
    }

    // Detect DSL changes and update MWP, formula, and DSL before sending to backend
    let updatedMWP = mwp;
    let updatedFormula = formula;
    let updatedDSL = dslValue;
    
    if (parsedDSL) {
      const changes = detectDSLChanges(parsedDSL, validatedParsedDSL);
      if (changes.length > 0) {
        const updated = updateMWPInput(mwp, formula, changes);
        updatedMWP = updated.mwp;
        updatedFormula = updated.formula ?? null;
        
        // Clear highlighting ranges since text positions have changed
        setMwpHighlightRanges([]);
        setFormulaHighlightRanges([]);
        
        // Filter for entity_type changes and collect distinct old->new mappings
        const entityTypeReplacements = changes
          .filter(change => change.type === 'entity_type' && change.oldValue && change.newValue)
          .reduce((map, change) => map.set(change.oldValue, change.newValue), new Map<string, string>());
        
        // Replace all occurrences of each old entity type with the new one in the DSL
        entityTypeReplacements.forEach((newValue, oldValue) => {
          const regex = new RegExp(`\\b${oldValue}\\b`, 'g');
          updatedDSL = updatedDSL.replace(regex, newValue);
        });
      }
    }

    // Create abort controller for this request
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
      toast.info('Generation cancelled');
    };

    onLoadingChange(true, abort);

    try {
      const result = await service.generateFromDSL(updatedDSL, controller.signal);

      // Pass results up with service-provided mappings and updated MWP
      onResult(
        result.visual_language,
        result.svg_formal,
        result.svg_intuitive,
        result.parsedDSL!,
        result.formal_error,
        result.intuitive_error,
        result.missing_svg_entities,
        updatedMWP, // Pass the updated MWP
        updatedFormula ?? undefined, // Pass the updated formula
        result.componentMappings,
        result.is_parse_error
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