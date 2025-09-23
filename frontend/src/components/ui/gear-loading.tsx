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
    container: "p-6",
    gearContainer: "w-12 h-8",
    gear1: "w-8 h-8",
    gear2: "w-6 h-6",
    gear2Position: "left-[22px]",
    message: "text-sm",
    cancelBtn: "h-8 px-3 text-xs",
    icon: "w-3.5 h-3.5",
    spacing: "mr-4"
  },
  default: {
    container: "p-4",
    gearContainer: "w-16 h-11",
    gear1: "w-11 h-11",
    gear2: "w-8 h-8",
    gear2Position: "left-[30px]",
    message: "text-base",
    cancelBtn: "h-9 px-4 text-sm",
    icon: "w-4 h-4",
    spacing: "mr-5"
  },
  large: {
    container: "p-6",
    gearContainer: "w-24 h-16",
    gear1: "w-16 h-16",
    gear2: "w-12 h-12",
    gear2Position: "left-[44px]",
    message: "text-lg",
    cancelBtn: "h-10 px-5 text-base",
    icon: "w-5 h-5",
    spacing: "mr-6"
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
    <div className={`flex items-center justify-center ${config.container}`}>
      {/* Left: Gears with subtle glow effect */}
      <div className={`relative flex items-center justify-center ${config.gearContainer} ${config.spacing} -mt-2`}>
        
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
        
        {/* Second gear - smaller */}
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
      
      {/* Right: Content with better typography and spacing */}
      <div className="flex flex-col items-start space-y-2">
        {/* Message with improved typography */}
        <div className="text-left">
          <span className={`font-bold text-foreground tracking-wide ${config.message}`}>
            {message}
          </span>
        </div>
        
        {/* Cancel button with better styling */}
        {showAbortButton && onAbort && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAbort}
            className={`${config.cancelBtn} text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 border border-muted-foreground/20 hover:border-destructive/30`}
            title="Cancel generation"
            aria-label="Cancel generation"
          >
            <X className={`${config.icon} mr-2`} />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}; 