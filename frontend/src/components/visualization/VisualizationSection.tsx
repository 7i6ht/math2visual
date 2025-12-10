// Individual visualization section component
import { useRef, useEffect } from "react";
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
  formulaValue?: string;
  onEmbeddedSVGClick: (event: MouseEvent) => void;
  onEntityQuantityClick: (event: MouseEvent) => void;
  onNameClick: (event: MouseEvent) => void;
  isPopupOpen?: boolean;
  isDisabled?: boolean;
}

export const VisualizationSection = ({
  type,
  title,
  svgContent,
  error,
  isOpen,
  mwpValue,
  formulaValue,
  onEmbeddedSVGClick,
  onEntityQuantityClick,
  onNameClick,
  isPopupOpen = false,
  isDisabled = false,
}: VisualizationSectionProps) => {
  const svgRef = useRef<HTMLDivElement | null>(null);
  const { currentDSLPath, hoverSource } = useHighlightingContext();

  // Handle SVG responsiveness
  const { makeResponsive, setupResizeObserver } = useSVGResponsive();
  
  // Setup ResizeObserver for this component (watches for container size changes)
  useEffect(() => {
    const cleanup = setupResizeObserver([svgRef]);
    return () => {
      cleanup();
    };
  }, [setupResizeObserver]);
  
  // Setup highlighting and interactions directly
  const highlighting = useHighlighting({ svgRef, mwpValue, formulaValue });
  const interactions = useElementInteractions({
    svgRef,
    sectionType: type,
    onEmbeddedSVGClick,
    onEntityQuantityClick,
    onNameClick,
    isPopupOpen,
    isDisabled,
  });
  
  // Inject SVG content, make it responsive, and attach interactions
  useEffect(() => {
    if (!isOpen || !svgRef.current || typeof svgContent !== 'string') return;
    
    svgRef.current.innerHTML = svgContent;
    makeResponsive(svgRef.current); // Sets up SVG attributes/styles and calculates initial size
    highlighting.setupTransformOrigins();
  }, [isOpen, svgContent, makeResponsive, highlighting.setupTransformOrigins]);

  // Setup interactions when popup state changes (separate effect to avoid SVG content replacement)
  useEffect(() => {
    if (svgRef.current && isOpen) {
      interactions.setupSVGInteractions();
    }
  }, [isPopupOpen, interactions.setupSVGInteractions, isOpen]);

  // Highlight the current DSL path
  useEffect(() => {
      // Only highlight if this section is open
      if (!isOpen) {
        return;
      }
      
      if (!hoverSource) {
        highlighting.removeElementHighlights();
      }
      
      if (currentDSLPath) {
        highlighting.highlightCurrentDSLPath();
      } else if (hoverSource === type) {
        highlighting.removeElementHighlights();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDSLPath, hoverSource, isOpen, type]);

  return (
    <div className="w-full">
        {error ? (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md w-full">
            <p className="text-destructive font-medium responsive-text-font-size">{error}</p>
          </div>
        ) : svgContent ? (
          <div className="w-full relative">
            <div className="rounded-lg border border-border/50 hover:border-border transition-colors w-full">
              <div className="p-4 bg-card w-full">
                <div ref={svgRef} className="w-full" />
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <DownloadButton
                svgContent={svgContent}
                type={type}
                title={title}
                disabled={isDisabled}
              />
          </div>
        </div>
        ) : null}
    </div>
  );
};
