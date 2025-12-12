import { memo, useEffect, useRef } from "react";
import type { TutorVisual } from "@/api_services/tutor";
import { useSVGResponsive } from "@/hooks/useSVGResponsive";

type ChatVisualProps = {
  visual: TutorVisual;
};

export const ChatVisual = memo(({ visual }: ChatVisualProps) => {
  const svgRef = useRef<HTMLDivElement | null>(null);
  const { makeResponsive } = useSVGResponsive();

  useEffect(() => {
    if (!svgRef.current || !visual.svg) return;
    svgRef.current.innerHTML = visual.svg;
    makeResponsive(svgRef.current, { align: "left" });
  }, [visual, makeResponsive]);

  return (
    <div className="mt-3 rounded-lg border bg-card p-3 shadow-sm text-left">
      <div className="w-full overflow-hidden rounded-md border bg-white">
        <div ref={svgRef} className="w-full" />
      </div>
    </div>
  );
});

ChatVisual.displayName = "ChatVisual";

