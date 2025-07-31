import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GearLoadingProps {
  message?: string;
  onAbort?: () => void;
  showAbortButton?: boolean;
}

export const GearLoading = ({ 
  message = "Generating ...", 
  onAbort,
  showAbortButton = true 
}: GearLoadingProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <div className="relative flex items-center justify-center w-14 h-10">
        {/* First gear - larger */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <svg
            className="gear-1 w-10 h-10 text-primary"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
          </svg>
        </div>
        
        {/* Second gear - smaller, moved 6px closer */}
        <div className="absolute left-[26px] top-1/2 transform -translate-y-1/2 translate-y-px">
          <svg
            className="gear-2 w-8 h-8 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
          </svg>
        </div>
      </div>
      
      <div className="flex flex-col items-center space-y-3">
        <span className="text-muted-foreground text-sm">{message}</span>
        
        {showAbortButton && onAbort && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAbort}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Cancel generation"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}; 