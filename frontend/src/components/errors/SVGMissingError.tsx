import { FileUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSVGMissingError } from "@/hooks/useSVGMissingError";

const PROVIDERS: Array<{
  key: string;
  label: string;
  url: (q: string) => string;
}> = [
  {
    key: "svgrepoRepoFree",
    label: "SVG Repo",
    url: (q: string) => `https://www.svgrepo.com/vectors/${encodeURIComponent(q)}`,
  },
  {
    key: "iconfont",
    label: "Iconfont",
    url: (q: string) => `https://www.iconfont.cn/search/index?searchType=icon&q=${encodeURIComponent(q)}`,
  },
  {
    key: "pexels",
    label: "Pexels",
    url: (q: string) => `https://www.pexels.com/search/${encodeURIComponent(q)}/`,
  },
  {
    key: "svgfind",
    label: "svgfind",
    url: (q: string) => `https://www.svgfind.com/vectors/${encodeURIComponent(q)}`,
  },
];

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
    <div>
      <div className="w-full">
        <div className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            SVG file required for visual generation is missing from the dataset. Attempted to find and pick the closest matching representation in dataset instead. 
          </p>

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
              Drag and drop your SVG file here
            </p>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={openFileDialog}
                disabled={uploadLoading}
                className="min-w-[150px] !text-font-size"
              >
                {getButtonIcon()}
                {getButtonText()}
              </Button>

              {!isLastEntity && missingSVGEntities.length > 1 && onGenerate && (
                <Button
                  onClick={() => onGenerate(undefined)}
                  disabled={uploadLoading}
                  variant="outline"
                  className="min-w-[120px] !text-font-size"
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

          {/* External Links Section */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-3">
            <p className="text-xs text-muted-foreground/70">
              Find SVGs online:
            </p>
              {PROVIDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => window.open(p.url(missingSvgName))}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors underline-offset-4 hover:underline !text-font-size"
                >
                  <ExternalLink className="w-3 h-3" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};