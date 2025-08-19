
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileImage, File, FileText } from "lucide-react";
import { downloadVisualization } from "@/utils/download";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import type { DownloadFormat } from "@/types";

interface VisualizationResultsProps {
  svgFormal: string | null;
  formalError: string | null;
  svgIntuitive: string | null;
  intuitiveError: string | null;
}

const downloadOptions = [
  { format: 'svg' as DownloadFormat, label: 'Download as SVG', icon: FileImage },
  { format: 'png' as DownloadFormat, label: 'Download as PNG', icon: File },
  { format: 'pdf' as DownloadFormat, label: 'Download as PDF', icon: FileText },
];

interface DownloadButtonProps {
  svgContent: string | null;
  type: 'formal' | 'intuitive';
  title: string;
}

const DownloadButton = ({ svgContent, type, title }: DownloadButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: DownloadFormat, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent accordion toggle
    if (!svgContent) return;
    
    setIsDownloading(true);
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} download...`);
    
    try {
      await downloadVisualization(svgContent, format, type);
      toast.success(`${format.toUpperCase()} file downloaded successfully!`, {
        id: toastId,
        description: `${title} has been saved to your downloads folder.`
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download ${format.toUpperCase()} file`, {
        id: toastId,
        description: error instanceof Error ? error.message : 'An unexpected error occurred.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!svgContent) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isDownloading}
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {downloadOptions.map((option) => (
          <DropdownMenuItem
            key={option.format}
            onClick={(e) => handleDownload(option.format, e)}
            className="cursor-pointer"
            disabled={isDownloading}
          >
            <span className="mr-2">
              <option.icon className="w-4 h-4" />
            </span>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const VisualizationResults = ({
  svgFormal,
  formalError,
  svgIntuitive,
  intuitiveError,
}: VisualizationResultsProps) => {
  const formalRef = useRef<HTMLDivElement | null>(null);
  const intuitiveRef = useRef<HTMLDivElement | null>(null);

  const toNumber = (value: string | null) => {
    if (!value) return null;
    const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : null;
  };

  const makeResponsive = (root: HTMLDivElement | null) => {
    if (!root) return;
    const svg = root.querySelector('svg');
    if (!svg) return;

    const hasViewBox = svg.hasAttribute('viewBox');
    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');

    // If no viewBox but width/height exist, create a viewBox so scaling works
    if (!hasViewBox) {
      const w = toNumber(widthAttr);
      const h = toNumber(heightAttr);
      if (w && h) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    // Base responsive settings
    svg.removeAttribute('height');
    (svg as unknown as HTMLElement).style.height = 'auto';
    (svg as unknown as HTMLElement).style.maxWidth = '100%';
    (svg as unknown as HTMLElement).style.display = 'block';
    (svg as unknown as HTMLElement).style.margin = '0 auto';
    if (!svg.getAttribute('preserveAspectRatio')) {
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    // Compute aspect ratio from viewBox (preferred) or width/height
    let vb = svg.getAttribute('viewBox');
    let vbW: number | null = null;
    let vbH: number | null = null;
    if (vb) {
      const parts = vb.split(/\s+/).map((v) => Number(v));
      if (parts.length === 4) {
        vbW = parts[2];
        vbH = parts[3];
      }
    }
    if (!vbW || !vbH) {
      vbW = toNumber(widthAttr);
      vbH = toNumber(heightAttr);
    }

    const containerWidth = root.clientWidth || root.getBoundingClientRect().width || 0;
    const clampPx = Math.round(window.innerHeight * 0.6); // 60vh

    if (containerWidth > 0 && vbW && vbH && vbW > 0) {
      const predictedHeight = containerWidth * (vbH / vbW);
      if (predictedHeight > clampPx) {
        const scale = clampPx / predictedHeight; // 0..1
        const widthPercent = Math.max(10, Math.min(100, Math.round(scale * 100)));
        svg.removeAttribute('width');
        (svg as unknown as HTMLElement).style.width = `${widthPercent}%`;
      } else {
        svg.removeAttribute('width');
        (svg as unknown as HTMLElement).style.width = '100%';
      }
    } else {
      // Fallback
      svg.removeAttribute('width');
      (svg as unknown as HTMLElement).style.width = '100%';
    }
  };

  // Handle accordion state changes
  const handleAccordionChange = (_value: string[]) => {
    makeResponsive(formalRef.current);
    makeResponsive(intuitiveRef.current);
  };

  // Apply responsive styling when SVG content changes
  useEffect(() => {
    makeResponsive(formalRef.current);
  }, [svgFormal]);

  useEffect(() => {
    makeResponsive(intuitiveRef.current);
  }, [svgIntuitive]);

  // Re-apply on window resize so clamping (viewport height calculation) stays accurate
  useEffect(() => {
    const onResize = () => {
      makeResponsive(formalRef.current);
      makeResponsive(intuitiveRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Only show the results container if there's something to display
  if (!svgFormal && !formalError && !svgIntuitive && !intuitiveError) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <h2 className="text-xl font-semibold mb-4 text-center">Generated Visualizations</h2>
      
      <Accordion 
        type="multiple" 
        defaultValue={["formal"]} 
        className="w-full space-y-2"
        onValueChange={handleAccordionChange}
      >
        {/* Formal Representation - Expanded by default */}
        <AccordionItem value="formal" className="border rounded-lg !border-b">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span className="font-medium">Formal Representation</span>
              <DownloadButton
                svgContent={svgFormal}
                type="formal"
                title="Formal Representation"
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {formalError ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md max-w-md">
                <p className="text-destructive font-medium text-sm">{formalError}</p>
              </div>
            ) : svgFormal ? (
              <div className="w-full">
                <div className="rounded-lg border border-border/50 hover:border-border transition-colors w-full">
                  <div className="p-4 bg-background w-full">
                    <div ref={formalRef} className="w-full" dangerouslySetInnerHTML={{ __html: svgFormal ?? '' }} />
                  </div>
                </div>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        {/* Intuitive Representation - Collapsed by default */}
        <AccordionItem value="intuitive" className="border rounded-lg !border-b">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center justify-between w-full mr-4">
              <span className="font-medium">Intuitive Representation</span>
              <DownloadButton
                svgContent={svgIntuitive}
                type="intuitive"
                title="Intuitive Representation"
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {intuitiveError ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md max-w-md">
                <p className="text-destructive font-medium text-sm">{intuitiveError}</p>
              </div>
            ) : svgIntuitive ? (
              <div className="w-full">
                <div className="rounded-lg border border-border/50 hover:border-border transition-colors w-full">
                  <div className="p-4 bg-background w-full">
                    <div ref={intuitiveRef} className="w-full" dangerouslySetInnerHTML={{ __html: svgIntuitive ?? '' }} />
                  </div>
                </div>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}; 