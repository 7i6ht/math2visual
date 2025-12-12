import { memo, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/visualization/DownloadButton";
import type { TutorVisual } from "@/api_services/tutor";
import { useSVGResponsive } from "@/hooks/useSVGResponsive";
import { ChatVisualPreview } from "./ChatVisualPreview";

type ChatVisualProps = {
  visual: TutorVisual;
};

export const ChatVisual = memo(({ visual }: ChatVisualProps) => {
  const { t } = useTranslation();
  const svgRef = useRef<HTMLDivElement | null>(null);
  const { makeResponsive } = useSVGResponsive();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !visual.svg) return;
    svgRef.current.innerHTML = visual.svg;
    makeResponsive(svgRef.current, { align: "center", maxHeight: Math.round(window.innerHeight * 0.8) });
  }, [visual, makeResponsive]);

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Custom resize handler that recalculates 80vh on each resize
    const handleResize = () => {
      if (svgRef.current) {
        makeResponsive(svgRef.current, { align: "center", maxHeight: Math.round(window.innerHeight * 0.8) });
      }
    };
    
    // Setup ResizeObserver for container resize
    const observer = new ResizeObserver(handleResize);
    observer.observe(svgRef.current);
    
    // Also listen to window resize
    window.addEventListener('resize', handleResize);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [makeResponsive]);

  return (
    <>
      <div className="mt-3 w-full min-w-0 sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px] xl:min-w-[320px] 2xl:min-w-[360px] 3xl:min-w-[640px] 4xl:min-w-[800px] 5xl:min-w-[960px] 6xl:min-w-[1120px] 7xl:min-w-[1280px] self-center rounded-lg border bg-card p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8 3xl:p-9 4xl:p-10 5xl:p-11 6xl:p-12 7xl:p-14 shadow-sm text-center">
        <div className="relative w-full overflow-hidden rounded-md border bg-white">
          {visual.svg && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
              <DownloadButton
                svgContent={visual.svg ?? null}
                type={visual.variant}
                title={
                  visual.variant === "formal"
                    ? t("visualization.formalVisualization")
                    : t("visualization.intuitiveVisualization")
                }
              />
              <Button
                variant="ghost"
                size="content"
                className="p-2 h-auto w-10 sm:w-12 md:w-14 lg:w-16 xl:w-18 2xl:w-20 3xl:w-22 4xl:w-24 5xl:w-26 6xl:w-28 7xl:w-30 rounded-md"
                aria-label={t("tutor.visualOpenLarge")}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsPreviewOpen(true);
                }}
              >
                <Maximize2 className="responsive-smaller-icon-font-size" aria-hidden="true" />
              </Button>
            </div>
          )}
          <div ref={svgRef} className="w-full" />
        </div>
      </div>

      {isPreviewOpen && (
        <ChatVisualPreview visual={visual} onClose={() => setIsPreviewOpen(false)} />
      )}
    </>
  );
});

ChatVisual.displayName = "ChatVisual";

