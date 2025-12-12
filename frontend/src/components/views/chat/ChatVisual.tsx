import { memo, useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/visualization/DownloadButton";
import type { TutorVisual } from "@/api_services/tutor";
import { useSVGResponsive } from "@/hooks/useSVGResponsive";

type ChatVisualProps = {
  visual: TutorVisual;
};

export const ChatVisual = memo(({ visual }: ChatVisualProps) => {
  const { t } = useTranslation();
  const svgRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { makeResponsive } = useSVGResponsive();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !visual.svg) return;
    svgRef.current.innerHTML = visual.svg;
    makeResponsive(svgRef.current, { align: "left" });
  }, [visual, makeResponsive]);

  useEffect(() => {
    if (!isPreviewOpen || !previewRef.current || !visual.svg) return;
    previewRef.current.innerHTML = visual.svg;
    makeResponsive(previewRef.current, { align: "center" });
  }, [isPreviewOpen, visual, makeResponsive]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const originalOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPreviewOpen]);

  return (
    <div className="mt-3 rounded-lg border bg-card p-3 shadow-sm text-left">
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

      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-1 sm:p-2"
          role="dialog"
          aria-modal="true"
          aria-label={
            visual.variant === "formal"
              ? t("visualization.formalVisualization")
              : t("visualization.intuitiveVisualization")
          }
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative h-full w-full overflow-hidden rounded-md bg-white p-2 sm:p-3 shadow-xl flex items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
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
                size="icon"
                className="rounded-md"
                aria-label={t("tutor.visualClosePreview")}
                onClick={() => setIsPreviewOpen(false)}
              >
                <X className="responsive-smaller-icon-font-size" aria-hidden="true" />
              </Button>
            </div>
            <div
              className="flex h-full w-full items-center justify-center overflow-hidden"
              style={{ maxHeight: "calc(100vh - 0.75rem)", maxWidth: "calc(100vw - 0.75rem)" }}
            >
              <div className="w-full h-full overflow-hidden rounded-md border bg-white flex items-center justify-center">
                <div
                  ref={previewRef}
                  className="w-full h-full flex items-center justify-center overflow-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ChatVisual.displayName = "ChatVisual";

