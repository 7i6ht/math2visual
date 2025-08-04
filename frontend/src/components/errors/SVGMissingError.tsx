import { useState, useRef } from "react";
import { Upload, FileUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { SVGMissingError as SVGMissingErrorType } from "@/types";

interface SVGMissingErrorProps {
  missingSvgError: SVGMissingErrorType;
  onUploadAndRegenerate: (file: File, expectedFilename: string) => Promise<void>;
  uploadLoading: boolean;
}

export const SVGMissingError = ({
  missingSvgError,
  onUploadAndRegenerate,
  uploadLoading
}: SVGMissingErrorProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.svg')) {
      toast.error("Please select an SVG file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    // Validate filename matches expected
    if (file.name !== missingSvgError.missing_svg_name) {
      toast.error(
        `Filename mismatch. Expected: ${missingSvgError.missing_svg_name}, Got: ${file.name}`,
        { description: "Please rename your file to match the expected filename." }
      );
      return;
    }

    // Trigger upload and regeneration
    onUploadAndRegenerate(file, missingSvgError.missing_svg_name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    handleFileSelect(file);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getButtonText = () => {
    if (uploadLoading) return "Processing...";
    return "Upload & Regenerate";
  };

  const getButtonIcon = () => {
    if (uploadLoading) return null; // No icon during loading
    return <Upload className="w-4 h-4 mr-2" />;
  };

  return (
    <div className="mt-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          {/* Error Message */}
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Missing SVG File</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {missingSvgError.both_failed 
                  ? "Both visualizations cannot be generated" 
                  : "One visualization cannot be generated"
                } because the required SVG file is missing from the dataset.
              </p>
            </div>
          </div>

          {/* Missing File Info */}
          <div className="bg-background/50 rounded-md p-3 mb-4">
            <p className="text-sm">
              <span className="font-medium">Missing file:</span>{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {missingSvgError.missing_svg_name}
              </code>
            </p>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileUp className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your SVG file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              File must be named: <code className="bg-muted px-1 py-0.5 rounded">
                {missingSvgError.missing_svg_name}
              </code>
            </p>

            <Button
              onClick={openFileDialog}
              disabled={uploadLoading}
              className="min-w-[180px]"
            >
              {getButtonIcon()}
              {getButtonText()}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Upload Instructions */}
          <div className="mt-4 text-xs text-muted-foreground">
            <p>• File must be in SVG format</p>
            <p>• Maximum file size: 5MB</p>
            <p>• File will be automatically scanned for security</p>
            <p>• Regeneration will start automatically after upload</p>
          </div>
        </div>
      </div>
    </div>
  );
};