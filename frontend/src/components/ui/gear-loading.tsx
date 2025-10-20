import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GearLoadingProps {
  onAbort?: () => void;
  showAbortButton?: boolean;
}

export const GearLoading = ({ 
  onAbort,
  showAbortButton = true
}: GearLoadingProps) => {

  return (
    <div className="flex items-center justify-center p-2">
      {/* Gears and cancel button positioned horizontally */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12 5xl:gap-14">
        
        {/* Gears container */}
        <div className="relative flex items-center justify-center w-10 h-6 sm:w-12 sm:h-8 md:w-16 md:h-11 lg:w-20 lg:h-14 xl:w-24 xl:h-16 2xl:w-28 2xl:h-20 3xl:w-32 3xl:h-24 4xl:w-36 4xl:h-28 5xl:w-40 5xl:h-32">
        
        {/* First gear - larger */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <svg
            className="gear-1 w-6 h-6 sm:w-8 sm:h-8 md:w-11 md:h-11 lg:w-14 lg:h-14 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20 3xl:w-24 3xl:h-24 4xl:w-28 4xl:h-28 5xl:w-32 5xl:h-32 text-primary"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
          </svg>
        </div>
        
        {/* Second gear - smaller, positioned to touch the first gear */}
        <div className="absolute left-[1rem] sm:left-[1.25rem] md:left-[1.75rem] lg:left-[2.25rem] xl:left-[2.75rem] 2xl:left-[4rem] 3xl:left-[4.75rem] 4xl:left-[5.5rem] 5xl:left-[6.25rem] top-1/2 transform translate-y-[calc(-50%+1px)]">
          <svg
            className="gear-2 w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 3xl:w-16 3xl:h-16 4xl:w-18 4xl:h-18 5xl:w-20 5xl:h-20 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
          </svg>
        </div>
        </div>
        
        {/* Cancel button positioned next to the gears */}
        {showAbortButton && onAbort && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAbort}
          className="text-xs sm:text-sm md:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl 4xl:text-3xl 5xl:text-4xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 border border-muted-foreground/20 hover:border-destructive/30 h-6 sm:h-7 md:h-8 lg:h-9 xl:h-10 2xl:h-12 3xl:h-14 4xl:h-16 5xl:h-18 px-2 sm:px-2 md:px-3 lg:px-4 xl:px-5 2xl:px-6 3xl:px-8 4xl:px-10 5xl:px-12"
          title="Cancel generation"
          aria-label="Cancel generation"
        >
          <X className="responsive-smaller-icon-font-size"/>
          Cancel
        </Button>
        )}
      </div>
    </div>
  );
};