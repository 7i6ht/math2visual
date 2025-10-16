import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GearLoadingProps {
  message?: string;
  onAbort?: () => void;
  showAbortButton?: boolean;
  size?: "small" | "default" | "large";
}

export const GearLoading = ({ 
  message = "Generating ...", 
  onAbort,
  showAbortButton = true,
  size = "default"
}: GearLoadingProps) => {

  return (
    <div className="flex flex-col items-center justify-center p-2">
      {/* Gears positioned above the cancel button */}
      <div className="relative flex items-center justify-center w-12 h-8 sm:w-16 sm:h-11 md:w-20 md:h-14 lg:w-24 lg:h-16 xl:w-28 xl:h-20 2xl:w-32 2xl:h-24 3xl:w-36 3xl:h-28 4xl:w-40 4xl:h-32 5xl:w-44 5xl:h-36 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6 2xl:mb-7 3xl:mb-8 4xl:mb-9 5xl:mb-10">
        
        {/* First gear - larger */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <svg
            className="gear-1 w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 3xl:w-28 3xl:h-28 4xl:w-32 4xl:h-32 5xl:w-36 5xl:h-36 text-primary"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
          </svg>
        </div>
        
        {/* Second gear - smaller, positioned to touch the first gear */}
        <div className="absolute left-[1.5rem] sm:left-[2rem] md:left-[2.5rem] lg:left-[3rem] xl:left-[3.5rem] 2xl:left-[4rem] 3xl:left-[4.5rem] 4xl:left-[5rem] 5xl:left-[5.5rem] top-1/2 transform translate-y-[calc(-50%+1px)]">
          <svg
            className="gear-2 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 3xl:w-18 3xl:h-18 4xl:w-20 4xl:h-20 5xl:w-22 5xl:h-22 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
          </svg>
        </div>
      </div>
      
      {/* Cancel button positioned below the gears */}
      {showAbortButton && onAbort && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAbort}
          className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl 4xl:text-4xl 5xl:text-5xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 border border-muted-foreground/20 hover:border-destructive/30 h-6 sm:h-8 md:h-9 lg:h-10 xl:h-12 2xl:h-14 3xl:h-16 4xl:h-18 5xl:h-20 px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 2xl:px-8 3xl:px-10 4xl:px-12 5xl:px-14"
          title="Cancel generation"
          aria-label="Cancel generation"
        >
          <X className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 3xl:w-9 3xl:h-9 4xl:w-10 4xl:h-10 5xl:w-11 5xl:h-11 mr-1 sm:mr-2" />
          Cancel
        </Button>
      )}
    </div>
  );
};