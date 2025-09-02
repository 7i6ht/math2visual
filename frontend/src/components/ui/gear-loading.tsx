import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GearLoadingProps {
  message?: string;
  onAbort?: () => void;
  showAbortButton?: boolean;
  size?: "small" | "default" | "large";
}

const sizeConfig = {
  small: {
    container: "space-y-2 py-4",
    gearContainer: "w-10 h-7",
    gear1: "w-7 h-7",
    gear2: "w-5 h-5",
    gear2Position: "left-[18px]",
    message: "text-xs",
    rowGap: "gap-0",
    cancelBtn: "h-6 w-6",
    icon: "w-3.5 h-3.5",
    cancelOffset: "translate-y-[1px]"
  },
  default: {
    container: "space-y-4 py-8",
    gearContainer: "w-14 h-10",
    gear1: "w-10 h-10",
    gear2: "w-8 h-8",
    gear2Position: "left-[26px]",
    message: "text-sm",
    rowGap: "gap-1",
    cancelBtn: "h-8 w-8",
    icon: "w-4 h-4",
    cancelOffset: "translate-y-[2px]"
  },
  large: {
    container: "space-y-6 py-12",
    gearContainer: "w-28 h-20",
    gear1: "w-20 h-20",
    gear2: "w-16 h-16",
    gear2Position: "left-[52px]",
    message: "text-base",
    rowGap: "gap-2",
    cancelBtn: "h-10 w-10",
    icon: "w-5 h-5",
    cancelOffset: "translate-y-[3px]"
  }
} as const;

export const GearLoading = ({ 
  message = "Generating ...", 
  onAbort,
  showAbortButton = true,
  size = "default"
}: GearLoadingProps) => {
  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center ${config.container}`}>
      <div className={`flex items-center justify-center ${config.rowGap}`}>
        <div className={`relative flex items-center justify-center ${config.gearContainer}`}>
          {/* First gear - larger */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
            <svg
              className={`gear-1 ${config.gear1} text-primary`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
          </div>
          
          {/* Second gear - smaller, moved accordingly */}
          <div className={`absolute ${config.gear2Position} top-1/2 transform -translate-y-1/2 translate-y-px`}>
            <svg
              className={`gear-2 ${config.gear2} text-muted-foreground`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center space-y-1">
        <span className={`text-muted-foreground ${config.message}`}>
          {message.replace(/\.{3}$/, "")} 
          <span className="inline-block ml-3 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "2.4s" }}>.</span>
          <span className="inline-block animate-bounce" style={{ animationDelay: "300ms", animationDuration: "2.4s" }}>.</span>
          <span className="inline-block animate-bounce" style={{ animationDelay: "600ms", animationDuration: "2.4s" }}>.</span>
        </span>

        {showAbortButton && onAbort && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAbort}
            className={`${config.cancelBtn} p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors ${config.cancelOffset}`}
            title="Cancel generation"
            aria-label="Cancel generation"
          >
            <X className={`${config.icon}`} />
          </Button>
        )}
      </div>
    </div>
  );
}; 