import { SyntaxEditor } from "@/components/ui/syntax-editor";
import { findDSLPathAtPosition } from "@/utils/dsl-cursor-mapping";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useVisualLanguageForm } from "@/hooks/useVisualLanguageForm";

interface VisualLanguageFormProps {
  vl: string | null;
  onResult: (vl: string, svgFormal: string | null, svgIntuitive: string | null, formalError?: string, intuitiveError?: string, missingSvgEntities?: string[], mwp?: string, formula?: string, componentMappings?: any) => void;
  onLoadingChange: (loading: boolean, abortFn?: () => void) => void;
  highlightRanges?: Array<[number, number]>;
  onDSLPathHighlight?: (dslPath: string | null) => void;
  componentMappings: Record<string, any>;
}

export const VisualLanguageForm = ({ 
  vl,
  onResult,
  onLoadingChange,
  highlightRanges = [],
  onDSLPathHighlight,
  componentMappings,
}: VisualLanguageFormProps) => {
  const { 
    form, 
    handleDebouncedChange,
  } = useVisualLanguageForm({
    vl,
    onResult,
    onLoadingChange,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-xl font-semibold mb-3 flex-shrink-0">Visual Language</h2>
      
      <Form {...form}>
        <div className="flex flex-col min-h-0 flex-1">
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
                    highlightRanges={highlightRanges}
                    onCursorPositionChange={(position, _) => {
                      const dslPath = findDSLPathAtPosition(componentMappings, position);
                      onDSLPathHighlight?.(dslPath);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
}; 