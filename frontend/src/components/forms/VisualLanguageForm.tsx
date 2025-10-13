import { SyntaxEditor } from "@/components/ui/syntax-editor";
import { useCallback, useMemo } from "react";
import { findDSLPathAtPosition } from "@/utils/dsl-cursor-mapping";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useVisualLanguageForm } from "@/hooks/useVisualLanguageForm";
import type { ComponentMapping } from "@/types/visualInteraction";
import type { ParsedOperation } from "@/utils/dsl-parser";
import { useHighlightingContext } from "@/contexts/HighlightingContext";
import { useDSLContext } from "@/contexts/DSLContext";

interface VisualLanguageFormProps {
  onResult: (vl: string, svgFormal: string | null, svgIntuitive: string | null, parsedDSL: ParsedOperation, currentParsedDSL: ParsedOperation, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: ComponentMapping) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  isDisabled?: boolean;
}

export const VisualLanguageForm = ({ 
  onResult,
  onLoadingChange,
  isDisabled = false,
}: VisualLanguageFormProps) => {
  const { dslHighlightRanges, setCurrentDSLPath, clearHighlighting } = useHighlightingContext();
  const { componentMappings: contextMappings } = useDSLContext();
  const effectiveMappings = useMemo(() => (contextMappings ?? {}) as ComponentMapping, [contextMappings]);
  
  const handleCursorPositionChange = useCallback((position: number) => {
    if (isDisabled) return;
    const dslPath = findDSLPathAtPosition(effectiveMappings, position);
    console.log('DSL Editor click - Position:', position, 'DSL Path:', dslPath);
    setCurrentDSLPath(dslPath);
  }, [effectiveMappings, setCurrentDSLPath, isDisabled]);

  const { 
    form, 
    handleDebouncedChange,
  } = useVisualLanguageForm({
    onResult,
    onLoadingChange,
  });

  const handleFormMouseLeave = useCallback(() => {
    if (isDisabled) return;
    clearHighlighting();
  }, [clearHighlighting, isDisabled]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-xl font-semibold mb-3 flex-shrink-0">Visual Language</h2>
      
      <Form {...form}>
        <div
          className={`flex flex-col min-h-0 flex-1 ${isDisabled ? 'pointer-events-none overflow-hidden' : ''}`}
          onMouseLeave={handleFormMouseLeave}
        >
          <FormField
            control={form.control}
            name="dsl"
            render={({ field }) => (
              <FormItem className="flex-1 flex flex-col min-h-0">
                <FormControl className="flex-1 min-h-0">
                  <SyntaxEditor
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      handleDebouncedChange(value);
                    }}
                    className="w-full"
                    height="100%"
                    highlightRanges={dslHighlightRanges}
                    onCursorPositionChange={handleCursorPositionChange}
                  />
                </FormControl>
                <FormMessage/>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
}; 