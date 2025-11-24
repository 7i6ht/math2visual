import { X, Loader2, Sparkles } from "lucide-react";

interface SparklesLoadingProps {
  onAbort?: () => void;
  showAbortButton?: boolean;
}

export const SparklesLoading = ({ 
  onAbort,
  showAbortButton = true
}: SparklesLoadingProps) => {
  return (
    <div className="flex items-center justify-center p-2">
      <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-7">
        {/* Sparkles animation */}
        <div className="relative">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 2xl:w-20 2xl:h-20 3xl:w-28 3xl:h-28 4xl:w-36 4xl:h-36 5xl:w-48 5xl:h-48 text-blue-500 animate-spin" />
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 3xl:w-14 3xl:h-14 4xl:w-18 4xl:h-18 5xl:w-24 5xl:h-24 text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Cancel button - text */}
        {showAbortButton && onAbort && (
          <button
            onClick={onAbort}
            className="group flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 xl:gap-3 2xl:gap-3.5 3xl:gap-4 4xl:gap-5 5xl:gap-6 text-gray-300 hover:text-destructive bg-transparent border-none transition-all duration-200 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 3xl:text-4xl 4xl:text-5xl 5xl:text-6xl cursor-pointer"
            title="Cancel"
            aria-label="Cancel generation"
          >
            <X className="w-0 h-0 opacity-0 group-hover:w-4 group-hover:h-4 group-hover:opacity-100 sm:group-hover:w-5 sm:group-hover:h-5 md:group-hover:w-6 md:group-hover:h-6 lg:group-hover:w-7 lg:group-hover:h-7 xl:group-hover:w-8 xl:group-hover:h-8 2xl:group-hover:w-10 2xl:group-hover:h-10 3xl:group-hover:w-12 3xl:group-hover:h-12 4xl:group-hover:w-16 4xl:group-hover:h-16 5xl:group-hover:w-20 5xl:group-hover:h-20 transition-all duration-200" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

