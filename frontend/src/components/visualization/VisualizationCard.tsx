import { Download } from "lucide-react";
import { downloadSvg } from "@/utils/download";
import type { VisualizationCardProps } from "@/types";

export const VisualizationCard = ({ 
  svgContent, 
  error, 
  title, 
  filename 
}: VisualizationCardProps) => {
  const handleDownload = () => {
    if (svgContent) {
      downloadSvg(svgContent, filename);
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
        className="svg-box"
        onClick={handleDownload}
        title="Click to download"
      >
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
        <div className="svg-overlay">
          <Download className="download-icon" />
        </div>
      </div>
      <p className="text-center font-medium text-muted-foreground">{title}</p>
    </div>
  );
}; 