import { useState } from "react";
import { Download, FileImage, File, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadVisualization } from "@/utils/download";
import type { VisualizationCardProps, DownloadFormat, DownloadOption } from "@/types";

const downloadOptions: DownloadOption[] = [
  { format: 'svg', label: 'Download as SVG', icon: 'FileImage' },
  { format: 'png', label: 'Download as PNG', icon: 'File' },
  { format: 'pdf', label: 'Download as PDF', icon: 'FileText' },
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'FileImage':
      return <FileImage className="w-4 h-4" />;
    case 'File':
      return <File className="w-4 h-4" />;
    case 'FileText':
      return <FileText className="w-4 h-4" />;
    default:
      return <Download className="w-4 h-4" />;
  }
};

export const VisualizationCard = ({ 
  svgContent, 
  error, 
  title, 
  type
}: VisualizationCardProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: DownloadFormat) => {
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

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md max-w-md">
        <p className="text-destructive font-medium text-sm">{error}</p>
      </div>
    );
  }

  if (!svgContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div 
        className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/50 hover:border-border transition-colors"
      >
        {/* SVG Content */}
        <div className="p-4 bg-background">
          <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        </div>
        
        {/* Download Button */}
        <div className="absolute bottom-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="bg-white border-0 shadow-none hover:bg-gray-50 p-2 h-8 w-8"
                disabled={isDownloading}
              >
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {downloadOptions.map((option) => (
                <DropdownMenuItem
                  key={option.format}
                  onClick={() => handleDownload(option.format)}
                  className="cursor-pointer"
                  disabled={isDownloading}
                >
                  <span className="mr-2">
                    {getIcon(option.icon)}
                  </span>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <p className="text-center font-medium text-muted-foreground">{title}</p>
    </div>
  );
}; 