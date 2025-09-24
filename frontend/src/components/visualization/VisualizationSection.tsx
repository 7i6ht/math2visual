// Individual visualization section component
import { useRef, useEffect } from "react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DownloadButton } from "./DownloadButton";
import { useHighlighting } from "@/hooks/useHighlighting";
import { useElementInteractions } from "@/hooks/useElementInteractions";
import { useSVGResponsive } from "@/hooks/useSVGResponsive";
import { useHighlightingContext } from "@/contexts/HighlightingContext";

interface VisualizationSectionProps {
  type: 'formal' | 'intuitive';
  title: string;
  svgContent: string | null;
  error: string | null;
  isOpen: boolean;
  mwpValue: string;
  onEmbeddedSVGClick: (dslPath: string, event: MouseEvent) => void;
  onEntityQuantityClick: (dslPath: string, event: MouseEvent) => void;
  onContainerNameClick: (dslPath: string, event: MouseEvent) => void;
  isSelectorOpen?: boolean;
}

export const VisualizationSection = ({
  type,
  title,
  svgContent,
  error,
  isOpen,
  mwpValue,
  onEmbeddedSVGClick,
  onEntityQuantityClick,
  onContainerNameClick,
  isSelectorOpen = false,
}: VisualizationSectionProps) => {
  const svgRef = useRef<HTMLDivElement | null>(null);

  const { currentDSLPath } = useHighlightingContext();

  // Handle SVG responsiveness
  const { makeResponsive, setupResizeListener } = useSVGResponsive();
  
  // Setup resize listener for this component
  useEffect(() => {
    const cleanup = setupResizeListener([svgRef]);
    return () => {
      cleanup();
    };
  }, [setupResizeListener]);
  
  // Setup highlighting and interactions directly
  const highlighting = useHighlighting({ svgRef, mwpValue });
  const interactions = useElementInteractions({
    svgRef,
    highlighting,
    onEmbeddedSVGClick,
    onEntityQuantityClick,
    onContainerNameClick,
    isSelectorOpen,
  });

  // Inject SVG content, make it responsive, and attach interactions
  useEffect(() => {
    if (!isOpen || !svgRef.current || typeof svgContent !== 'string') return;
    svgRef.current.innerHTML = svgContent;
    makeResponsive(svgRef.current);
    interactions.setupSVGInteractions();
    highlighting.setupTransformOrigins();
  }, [isOpen, svgContent, makeResponsive, interactions, highlighting]);

  // Highlight the current DSL path (on DSL editor click)
  useEffect(() => {
      highlighting.highlightCurrentDSLPath();
  }, [currentDSLPath, highlighting]);

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
