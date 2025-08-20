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
import { useState } from "react";
import type { DownloadFormat } from "@/types";

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

export const DownloadButton = ({ svgContent, type, title }: DownloadButtonProps) => {
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
