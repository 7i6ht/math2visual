import React, { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BasePopup } from "./BasePopup";

interface NamePopupProps {
  onClose: () => void;
  onUpdate: (newValue: string) => Promise<void>;
  initialValue: string;
}

export const NamePopup: React.FC<NamePopupProps> = ({
  onClose,
  onUpdate,
  initialValue,
}) => {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate dynamic width based on content length
  const getInputWidth = () => {
    const minWidth = 80; // w-20 equivalent
    const maxWidth = 300; // reasonable maximum
    const padding = 32; // px-2 on both sides + border
    const charWidth = 8; // approximate character width in pixels for monospace-like text
    
    // Use placeholder text length if value is empty
    const textLength = value.length || "Enter name...".length;
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textLength * charWidth + padding));
    
    return `${calculatedWidth}px`;
  };

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Handle value update
  const handleUpdate = async () => {
    if (!value.trim()) {
      toast.error(`Please enter a name`);
      return;
    }

    // Don't update if value hasn't changed
    if (value.trim() === initialValue) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(value.trim());
      onClose();
      toast.success(`Name updated to "${value.trim()}"`);
    } catch (err) {
      console.error(`Failed to update name:`, err);
      toast.error(`Failed to update name. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard events for popup
  const handlePopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && value.trim() && !isLoading) {
      event.preventDefault();
      handleUpdate();
    }
  };

  const isValidValue = value.trim().length > 0;

  return (
    <BasePopup
      onClose={onClose}
      onKeyDown={handlePopupKeyDown}
      className="w-fit max-w-[95vw] min-w-fit"
    >
      <div className="flex flex-col gap-2">
        {/* Input and Update Button */}
        <div className="flex gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={"Enter name..."}
            spellCheck={false}
            className="rounded-r-none border-r-0 h-9 text-sm focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation text-center px-2"
            style={{ width: getInputWidth() }}
            disabled={isLoading}
          />
          <Button
            onClick={handleUpdate}
            disabled={!isValidValue || isLoading}
            className="px-2 rounded-l-none h-9 text-sm focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation flex-shrink-0"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Validation hint */}
        {value && !isValidValue && (
          <div className="text-xs text-red-600 px-1">
            Please enter a name
          </div>
        )}
      </div>
    </BasePopup>
  );
};

