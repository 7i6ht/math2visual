// Individual visualization section component
import { useRef, useEffect } from "react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DownloadButton } from "./DownloadButton";
import { useVisualInteraction } from "@/hooks/useVisualInteraction";
import type { ComponentMapping } from "@/types/visualInteraction";
import { useSVGResponsive } from "@/hooks/useSVGResponsive";

interface VisualizationSectionProps {
  type: 'formal' | 'intuitive';
  title: string;
  svgContent: string | null;
  error: string | null;
  componentMappings: ComponentMapping;
  isOpen: boolean;
  mwpValue: string;
  onDSLRangeHighlight?: (ranges: Array<[number, number]>) => void;
  onMWPRangeHighlight?: (ranges: Array<[number, number]>) => void;
  currentDSLPath?: string | null;
  onEmbeddedSVGClick: (dslPath: string, event: MouseEvent) => void;
}

export const VisualizationSection = ({
  type,
  title,
  svgContent,
  error,
  componentMappings,
  isOpen,
  mwpValue,
  onDSLRangeHighlight,
  onMWPRangeHighlight,
  currentDSLPath,
  onEmbeddedSVGClick,
}: VisualizationSectionProps) => {
  const svgRef = useRef<HTMLDivElement | null>(null);
  
  // Handle SVG responsiveness
  const { makeResponsive, setupResizeListener } = useSVGResponsive();
  
  // Setup resize listener for this component
  useEffect(() => {
    const cleanup = setupResizeListener([svgRef]);
    return cleanup;
  }, [setupResizeListener]);
  
  // Setup visual interactions
  const {
    setComponentMappings,
    setupSVGInteractions,
  } = useVisualInteraction({
    svgRef,
    mwpValue,
    onDSLRangeHighlight,
    onMWPRangeHighlight,
    currentDSLPath,
    onEmbeddedSVGClick,
  });


  // Update component mappings when they change
  useEffect(() => {
    setComponentMappings(componentMappings);
  }, [componentMappings, setComponentMappings]);

  // Handle SVG content injection and setup when accordion opens
  useEffect(() => {
    if (isOpen && svgRef.current && typeof svgContent === 'string') {
      // Check if SVG content is missing and inject it
      if (!svgRef.current.innerHTML.includes('<svg')) {
        svgRef.current.innerHTML = svgContent;
        makeResponsive(svgRef.current);
      }
      // Always setup interactions when accordion is open
      setupSVGInteractions();
    }
  }, [isOpen, svgContent, setupSVGInteractions, makeResponsive]);

  // Apply responsive styling when SVG content changes
  useEffect(() => {
    if (svgRef.current && typeof svgContent === 'string') {
      svgRef.current.innerHTML = svgContent;
      makeResponsive(svgRef.current);
    }
  }, [svgContent, makeResponsive]);

  return (
    <AccordionItem value={type} className="border rounded-lg !border-b">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center justify-between w-full mr-4">
          <span className="font-medium">{title}</span>
          <DownloadButton
            svgContent={svgContent}
            type={type}
            title={title}
          />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        {error ? (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md max-w-md">
            <p className="text-destructive font-medium text-sm">{error}</p>
          </div>
        ) : svgContent ? (
          <div className="w-full">
            <div className="rounded-lg border border-border/50 hover:border-border transition-colors w-full">
              <div className="p-4 bg-background w-full">
                <div ref={svgRef} className="w-full" />
              </div>
            </div>
          </div>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
};
