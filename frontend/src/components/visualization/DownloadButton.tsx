import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileImage, File, FileText } from "lucide-react";
import { downloadSvg, downloadPng, downloadPdf, generateVisualizationFilename } from "@/utils/download";
import { useAnalytics } from "@/hooks/useAnalytics";
import { toast } from "sonner";
import { useState } from "react";
import type { DownloadFormat } from "@/types";

const downloadOptions = [
  { 
    format: "svg" as DownloadFormat, 
    label: "SVG", 
    icon: FileImage,
    handler: (svgContent: string, type: "formal" | "intuitive") => {
      const filename = generateVisualizationFilename(type, "svg");
      downloadSvg(svgContent, filename);
    }
  },
  { 
    format: "png" as DownloadFormat, 
    label: "PNG", 
    icon: File,
    handler: (svgContent: string, type: "formal" | "intuitive") => {
      const filename = generateVisualizationFilename(type, "png");
      downloadPng(svgContent, filename);
    }
  },
  { 
    format: "pdf" as DownloadFormat, 
    label: "PDF", 
    icon: FileText,
    handler: async (svgContent: string, type: "formal" | "intuitive") => {
      const filename = generateVisualizationFilename(type, "pdf");
      await downloadPdf(svgContent, filename);
    }
  },
];

interface DownloadButtonProps {
  svgContent: string | null;
  type: "formal" | "intuitive";
  title: string;
  disabled?: boolean;
}

export const DownloadButton = ({
  svgContent,
  type,
  title,
  disabled = false,
}: DownloadButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { trackDownload, trackError, isAnalyticsEnabled } = useAnalytics();

  const handleDownload = async (
    handler: (svgContent: string,
    type: "formal" | "intuitive") => void | Promise<void>,
    format: DownloadFormat,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent accordion toggle
    if (!svgContent || disabled || isDownloading) return;

    setIsDownloading(true);
    const toastId = toast.loading(
      `Preparing ${format.toUpperCase()} download...`
    );

    // Track download start
    if (isAnalyticsEnabled) {
      trackDownload(format, `${type}_${format}`);
    }

    try {
      await handler(svgContent, type);
      
      // Track successful download
      if (isAnalyticsEnabled) {
        trackDownload(format, `${type}_${format}`);
      }
      
      toast.success(`${format.toUpperCase()} file downloaded successfully!`, {
        id: toastId,
        description: `${title} has been saved to your downloads folder.`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      
      // Track download error
      if (isAnalyticsEnabled) {
        trackError(`${type}_download_${format}_failed`, error instanceof Error ? error.message : "Download failed");
      }
      
      toast.error(`Failed to download ${format.toUpperCase()} file`, {
        id: toastId,
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!svgContent) return null;

  const isDisabled = disabled || isDownloading;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="p-0 h-auto w-auto"
          size="content"
          disabled={isDisabled}
          onClick={(e) => e.stopPropagation()}
          aria-label="Download"
        >
          <Download className="responsive-smaller-icon-font-size" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={10} className="w-fit min-w-0 px-1 py-1 md:px-2 md:py-2 lg:px-3 lg:py-3">
        <DropdownMenuLabel className="px-2 py-1.5 cursor-default select-none">
          <span className="responsive-text-font-size text-muted-foreground">Download</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {downloadOptions.map((option) => (
          <DropdownMenuItem
            key={option.format}
            onClick={(e) => handleDownload(option.handler, option.format, e)}
            className="cursor-pointer responsive-text-font-size flex items-center gap-1"
            disabled={isDisabled}
          >
            <option.icon className="responsive-smaller-icon-font-size flex-shrink-0" aria-hidden="true" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
