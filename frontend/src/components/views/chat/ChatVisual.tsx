import { useEffect, useRef } from "react";
import type { TutorVisual } from "@/api_services/tutor";
import { useSVGResponsive } from "@/hooks/useSVGResponsive";

type ChatVisualProps = {
  visual: TutorVisual;
  title: string;
};

export const ChatVisual = ({ visual, title }: ChatVisualProps) => {
  const svgRef = useRef<HTMLDivElement | null>(null);
  const { makeResponsive, setupResizeListener } = useSVGResponsive();

  useEffect(() => {
    if (!svgRef.current || !visual.svg) return;
    svgRef.current.innerHTML = visual.svg;
    makeResponsive(svgRef.current, { align: "left" });
  }, [visual, makeResponsive]);

  useEffect(() => {
    const cleanup = setupResizeListener([svgRef], { align: "left" });
    return () => {
      cleanup();
    };
  }, [setupResizeListener]);

  return (
    <div className="mt-3 rounded-lg border bg-card p-3 shadow-sm text-left">
      <div className="responsive-text-font-size font-semibold mb-2">{title}</div>
      <div className="w-full overflow-hidden rounded-md border bg-white">
        <div ref={svgRef} className="w-full" />
      </div>
      {visual.reason && (
        <p className="mt-2 responsive-text-font-size text-muted-foreground">{visual.reason}</p>
      )}
    </div>
  );
};

