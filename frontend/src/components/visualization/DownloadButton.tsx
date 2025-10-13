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
import { downloadVisualization } from "@/utils/download";
import { toast } from "sonner";
import { useState } from "react";
import type { DownloadFormat } from "@/types";

const downloadOptions = [
  { format: "svg" as DownloadFormat, label: "SVG", icon: FileImage },
  { format: "png" as DownloadFormat, label: "PNG", icon: File },
  { format: "pdf" as DownloadFormat, label: "PDF", icon: FileText },
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

  const handleDownload = async (
    format: DownloadFormat,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent accordion toggle
    if (!svgContent || disabled || isDownloading) return;

    setIsDownloading(true);
    const toastId = toast.loading(
      `Preparing ${format.toUpperCase()} download...`
    );

    try {
      await downloadVisualization(svgContent, format, type);
      toast.success(`${format.toUpperCase()} file downloaded successfully!`, {
        id: toastId,
        description: `${title} has been saved to your downloads folder.`,
      });
    } catch (error) {
      console.error("Download failed:", error);
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
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isDisabled}
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit min-w-0">
        <DropdownMenuLabel className="px-2 py-1.5 text-sm text-muted-foreground cursor-default select-none">
          Download
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {downloadOptions.map((option) => (
          <DropdownMenuItem
            key={option.format}
            onClick={(e) => handleDownload(option.format, e)}
            className="cursor-pointer"
            disabled={isDisabled}
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
