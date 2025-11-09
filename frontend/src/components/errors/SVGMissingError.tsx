import { FileUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSVGMissingError } from "@/hooks/useSVGMissingError";
import { trackElementClick, isAnalyticsEnabled } from "@/services/analyticsTracker";

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
  const analyticsEnabled = isAnalyticsEnabled();
  
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
    handleGenerateClick,
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
        <div className="space-y-4 md:space-y-6 lg:space-y-8 xl:space-y-10 2xl:space-y-12 3xl:space-y-14 4xl:space-y-16 5xl:space-y-20 6xl:space-y-24 7xl:space-y-28">
          {/* Description */}
          <span className="responsive-text-font-size text-muted-foreground">
            SVG file required for visual generation is missing from the dataset. Attempted to find and pick the closest matching representation in dataset instead. 
          </span>

          {/* Missing File Info */}
          <div className="bg-background/50 rounded-md p-3 md:p-4 lg:p-5 xl:p-6 2xl:p-8 3xl:p-10 4xl:p-12 5xl:p-16 6xl:p-20 7xl:p-24 mb-4 md:mb-6 lg:mb-8 xl:mb-10 2xl:mb-12 3xl:mb-14 4xl:mb-16 5xl:mb-20 6xl:mb-24 7xl:mb-28">
            {missingSVGEntities.length > 1 ? (
              <div>
                <p className="responsive-text-font-size mb-2 md:mb-3 lg:mb-4 xl:mb-5 2xl:mb-6 3xl:mb-8 4xl:mb-10 5xl:mb-12 6xl:mb-14 7xl:mb-16">
                  <span className="font-medium">Missing files:</span>{" "}
                  <span className="text-muted-foreground">
                    {currentEntityIndex + 1} of {missingSVGEntities.length}
                  </span>
                </p>
                <p className="responsive-text-font-size">
                  <span className="font-medium">Current file:</span>{" "}
                  <code className="bg-muted px-1.5 py-0.5 md:px-2 md:py-1 lg:px-2.5 lg:py-1.5 xl:px-3 xl:py-2 2xl:px-4 2xl:py-2.5 3xl:px-5 3xl:py-3 4xl:px-6 4xl:py-4 5xl:px-8 5xl:py-5 6xl:px-10 6xl:py-6 7xl:px-12 7xl:py-8 rounded !responsive-text-font-size">
                    {missingSvgName}
                  </code>
                </p>
              </div>
            ) : (
              <p className="responsive-text-font-size">
                <span className="font-medium">Missing file:</span>{" "}
                <code className="bg-muted px-1.5 py-0.5 md:px-2 md:py-1 lg:px-2.5 lg:py-1.5 xl:px-3 xl:py-2 2xl:px-4 2xl:py-2.5 3xl:px-5 3xl:py-3 4xl:px-6 4xl:py-4 5xl:px-8 5xl:py-5 6xl:px-10 6xl:py-6 7xl:px-12 7xl:py-8 rounded !responsive-text-font-size">
                  {missingSvgName}
                </code>
              </p>
            )}
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 md:p-8 lg:p-10 xl:p-12 2xl:p-16 3xl:p-20 4xl:p-24 5xl:p-28 6xl:p-32 7xl:p-36 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileUp className="responsive-icon-font-size mx-auto mb-3 md:mb-4 lg:mb-5 xl:mb-6 2xl:mb-8 3xl:mb-10 4xl:mb-12 5xl:mb-16 6xl:mb-20 7xl:mb-24 text-muted-foreground" />
            <p className="responsive-text-font-size text-muted-foreground mb-4 md:mb-6 lg:mb-8 xl:mb-10 2xl:mb-12 3xl:mb-14 4xl:mb-16 5xl:mb-20 6xl:mb-24 7xl:mb-28">
              Drag and drop your SVG file here
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12 5xl:gap-16 6xl:gap-20 7xl:gap-24 justify-center items-center">
              <Button
                onClick={openFileDialog}
                disabled={uploadLoading}
                className="button-responsive-size !responsive-text-font-size w-full sm:w-auto min-w-[150px] md:min-w-[180px] lg:min-w-[200px] xl:min-w-[220px] 2xl:min-w-[250px] 3xl:min-w-[280px] 4xl:min-w-[320px] 5xl:min-w-[360px] 6xl:min-w-[400px] 7xl:min-w-[440px]"
              >
                {getButtonIcon()}
                {getButtonText()}
              </Button>

              {!isLastEntity && missingSVGEntities.length > 1 && (
                <Button
                  onClick={handleGenerateClick}
                  disabled={uploadLoading}
                  variant="outline"
                  className="button-responsive-size !responsive-text-font-size w-full sm:w-auto min-w-[120px] md:min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] 2xl:min-w-[200px] 3xl:min-w-[220px] 4xl:min-w-[240px] 5xl:min-w-[260px] 6xl:min-w-[280px] 7xl:min-w-[300px]"
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
          <div className="mt-4 md:mt-6 lg:mt-8 xl:mt-10 2xl:mt-12 3xl:mt-14 4xl:mt-16 5xl:mt-20 6xl:mt-24 7xl:mt-28">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 md:gap-3 lg:gap-4 xl:gap-5 2xl:gap-6 3xl:gap-8 4xl:gap-10 5xl:gap-12 6xl:gap-14 7xl:gap-16 items-start sm:items-center">
              <p className="responsive-text-font-size text-muted-foreground/70 whitespace-nowrap">
                Find SVGs online:
              </p>
              <div className="flex flex-wrap gap-2 md:gap-3 lg:gap-4 xl:gap-5 2xl:gap-6 3xl:gap-8 4xl:gap-10 5xl:gap-12 6xl:gap-14 7xl:gap-16">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    {...(analyticsEnabled ? {
                      onClick: () => {
                        trackElementClick(`external_link_click`, p.key);
                        window.open(p.url(missingSvgName));
                      },
                    } : {
                      onClick: () => window.open(p.url(missingSvgName)),
                    })}
                    className="inline-flex items-center gap-1.5 md:gap-2 lg:gap-2.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors underline-offset-4 hover:underline min-w-fit"
                  >
                    <ExternalLink className="responsive-smaller-icon-font-size"/>
                    <span className="responsive-smaller-text-font-size">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};