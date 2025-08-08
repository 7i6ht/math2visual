import { FileUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSVGMissingError } from "@/hooks/useSVGMissingError";

interface SVGMissingErrorProps {
  missingSVGEntities: string[];
  onUploadOnly?: (file: File, expectedFilename: string) => Promise<[string, boolean]>;
  onGenerate?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
}

export const SVGMissingError = ({
  missingSVGEntities,
  onGenerate,
  onAllFilesUploaded,
}: SVGMissingErrorProps) => {
  const {
    isDragOver,
    uploadLoading,
    currentEntityIndex,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileInputChange,
    openFileDialog,
    getButtonText,
    getButtonIcon,
  } = useSVGMissingError({
    missingSVGEntities,
    onGenerate,
    onAllFilesUploaded,
  });

  const missingSvgName = missingSVGEntities[currentEntityIndex];
  const isLastEntity = currentEntityIndex === missingSVGEntities.length - 1;

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
                SVG file required for visual generation is missing from the dataset. Attempted to find and pick the closest matching representation in dataset instead. 
              </p>
            </div>
          </div>

          {/* Missing File Info */}
          <div className="bg-background/50 rounded-md p-3 mb-4">
            {missingSVGEntities.length > 1 ? (
              <div>
                <p className="text-sm mb-2">
                  <span className="font-medium">Missing files:</span>{" "}
                  <span className="text-muted-foreground">
                    {currentEntityIndex + 1} of {missingSVGEntities.length}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Current file:</span>{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {missingSvgName}
                  </code>
                </p>
              </div>
            ) : (
              <p className="text-sm">
                <span className="font-medium">Missing file:</span>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  {missingSvgName}
                </code>
              </p>
            )}
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

            <div className="flex gap-3 justify-center">
              <Button
                onClick={openFileDialog}
                disabled={uploadLoading}
                className="min-w-[150px]"
              >
                {getButtonIcon()}
                {getButtonText()}
              </Button>

              {!isLastEntity && missingSVGEntities.length > 1 && onGenerate && (
                <Button
                  onClick={() => onGenerate(undefined)}
                  disabled={uploadLoading}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  Generate
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};