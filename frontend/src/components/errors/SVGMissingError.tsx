import { FileUp, ExternalLink, Sparkles, Loader2, Check, X, CircleStop } from "lucide-react";
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
    generateLoading,
    isGeneratingSVG,
    currentEntityIndex,
    generatedSVG,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileInputChange,
    openFileDialog,
    handleGenerateClick,
    handleAbortGeneration,
    handleConfirmGenerated,
    handleDiscardGenerated,
    handleSelectMissingEntity,
    getButtonText,
    getButtonIcon,
  } = useSVGMissingError({
    missingSVGEntities,
    onGenerate,
    onAllFilesUploaded,
  });

  const missingSvgName = missingSVGEntities[currentEntityIndex];

  return (
    <div>
      <div className="w-full">
        <div className="space-y-4 md:space-y-6 lg:space-y-8 xl:space-y-10 2xl:space-y-12 3xl:space-y-14 4xl:space-y-16 5xl:space-y-20 6xl:space-y-24 7xl:space-y-28">
          {/* Description */}
          <span className="responsive-text-font-size text-muted-foreground">
            SVG file required for visual generation is missing from the dataset. Attempted to find and pick the closest matching representation in dataset instead. 
          </span>

          {/* Missing File Selection */}
          <div className="bg-background/50 rounded-md p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8 3xl:p-10 4xl:p-12 5xl:p-14 6xl:p-16 7xl:p-20 mb-4 md:mb-6 lg:mb-8 xl:mb-10 2xl:mb-12 3xl:mb-14 4xl:mb-16 5xl:mb-20 6xl:mb-24 7xl:mb-28 space-y-3">
            <p className="responsive-text-font-size font-medium text-muted-foreground">
              Select the missing entity to upload or generate an icon:
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3 lg:gap-4 xl:gap-5 2xl:gap-6 3xl:gap-8">
              {missingSVGEntities.map((entity, index) => {
                const isSelected = index === currentEntityIndex;
                return (
                  <span
                    key={entity + index}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectMissingEntity(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectMissingEntity(index);
                      }
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm md:text-base transition-colors cursor-pointer bg-white ${
                      isSelected
                        ? "border-primary text-primary shadow-sm"
                        : "border-input text-muted-foreground hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-primary/60" aria-hidden />
                    {entity}
                  </span>
                );
              })}
            </div>
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
            {isGeneratingSVG ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-16 lg:h-16 xl:w-18 xl:h-18 2xl:w-20 2xl:h-20 3xl:w-24 3xl:h-24 4xl:w-28 4xl:h-28 5xl:w-32 5xl:h-32 text-blue-500 animate-spin" />
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-8 lg:h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 3xl:w-12 3xl:h-12 4xl:w-14 4xl:h-14 5xl:w-16 5xl:h-16 text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="responsive-text-font-size text-muted-foreground">
                  Generating "{missingSvgName}" icon...
                </p>
                <Button
                  onClick={() => handleAbortGeneration()}
                  variant="outline"
                  disabled={!isGeneratingSVG}
                  className="button-responsive-size !responsive-text-font-size"
                >
                  <CircleStop className="responsive-icon-font-size mr-2" />
                  Cancel generation
                </Button>
              </div>
            ) : generatedSVG ? (
              <div className="flex flex-col items-center justify-center gap-4 md:gap-5 lg:gap-6">
                <div
                  className="svg-preview-container w-full h-[280px] flex items-center justify-center bg-background/50 rounded-md p-4 md:p-5 lg:p-6 overflow-hidden [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-full [&_svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: generatedSVG }}
                />
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-5 justify-center items-center w-full">
                  <Button
                    onClick={handleConfirmGenerated}
                    disabled={uploadLoading || generateLoading}
                    className="button-responsive-size !responsive-text-font-size w-full sm:w-auto min-w-[120px] md:min-w-[140px] lg:min-w-[160px]"
                  >
                    <Check className="responsive-icon-font-size mr-2" />
                    Confirm
                  </Button>
                  <Button
                    onClick={handleDiscardGenerated}
                    disabled={uploadLoading || generateLoading}
                    variant="outline"
                    className="button-responsive-size !responsive-text-font-size w-full sm:w-auto min-w-[120px] md:min-w-[140px] lg:min-w-[160px]"
                  >
                    <X className="responsive-icon-font-size mr-2" />
                    Discard
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <FileUp className="responsive-icon-font-size mx-auto mb-3 md:mb-4 lg:mb-5 xl:mb-6 2xl:mb-8 3xl:mb-10 4xl:mb-12 5xl:mb-16 6xl:mb-20 7xl:mb-24 text-muted-foreground" />
                <p className="responsive-text-font-size text-muted-foreground mb-4 md:mb-6 lg:mb-8 xl:mb-10 2xl:mb-12 3xl:mb-14 4xl:mb-16 5xl:mb-20 6xl:mb-24 7xl:mb-28">
                  Drag and drop your SVG file here
                </p>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12 5xl:gap-16 6xl:gap-20 7xl:gap-24 justify-center items-center">
                  <Button
                    onClick={openFileDialog}
                    disabled={uploadLoading || generateLoading}
                    className="button-responsive-size !responsive-text-font-size w-full sm:w-auto min-w-[150px] md:min-w-[180px] lg:min-w-[200px] xl:min-w-[220px] 2xl:min-w-[250px] 3xl:min-w-[280px] 4xl:min-w-[320px] 5xl:min-w-[360px] 6xl:min-w-[400px] 7xl:min-w-[440px]"
                  >
                    {getButtonIcon()}
                    {getButtonText()}
                  </Button>

                  <Button
                    onClick={handleGenerateClick}
                    disabled={uploadLoading || generateLoading}
                    variant="outline"
                    className="button-responsive-size !responsive-text-font-size w-full sm:w-auto min-w-[120px] md:min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] 2xl:min-w-[200px] 3xl:min-w-[220px] 4xl:min-w-[240px] 5xl:min-w-[260px] 6xl:min-w-[280px] 7xl:min-w-[300px]"
                  >
                    <Sparkles className="responsive-icon-font-size mr-2" />
                    Generate
                  </Button>
                </div>
              </>
            )}

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