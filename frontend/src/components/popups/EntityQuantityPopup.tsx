import React, { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BasePopup } from "./BasePopup";
import { useDSLContext } from "@/contexts/DSLContext";
import { getEntityQuantityValue } from "@/hooks/useEntityQuantityPopup";

interface EntityQuantityPopupProps {
  onClose: () => void;
  onUpdate: (newQuantity: number) => Promise<void>;
  dslPath: string;
}

export const EntityQuantityPopup: React.FC<EntityQuantityPopupProps> = ({
  onClose,
  onUpdate,
  dslPath,
}) => {
  const [quantity, setQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { componentMappings } = useDSLContext();

  // Initialize with current value from DSL context
  useEffect(() => {
    const currentValue =
      getEntityQuantityValue(componentMappings, dslPath) || 1;
    setQuantity(currentValue.toString());
  }, [dslPath, componentMappings]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Validate input to only allow integers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty string or positive integers only
    if (value === "" || /^[1-9]\d*$/.test(value)) {
      setQuantity(value);
    }
  };

  // Handle quantity update
  const handleUpdate = async () => {
    if (!quantity || quantity === "0") {
      toast.error("Please enter a valid positive integer");
      return;
    }

    const numericQuantity = parseInt(quantity, 10);

    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      toast.error("Please enter a valid positive integer");
      return;
    }

    // Don't update if value hasn't changed
    const currentValue =
      getEntityQuantityValue(componentMappings, dslPath) || 1;
    if (numericQuantity === currentValue) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(numericQuantity);
      onClose();
      toast.success(`Entity quantity updated to ${numericQuantity}`);
    } catch (err) {
      console.error("Failed to update entity quantity:", err);
      toast.error("Failed to update entity quantity. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard events for popup
  const handlePopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && quantity && !isLoading) {
      event.preventDefault();
      handleUpdate();
    }
  };

  const isValidQuantity = quantity && /^[1-9]\d*$/.test(quantity);

  return (
    <BasePopup
      onClose={onClose}
      onKeyDown={handlePopupKeyDown}
      className="min-w-fit max-w-[95vw] w-fit"
    >
      <div className="flex flex-col gap-2">
        {/* Input and Update Button */}
        <div className="flex gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
          <Input
            ref={inputRef}
            value={quantity}
            onChange={handleInputChange}
            placeholder="Enter quantity..."
            spellCheck={false}
            className="rounded-r-none border-r-0 h-9 text-sm focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation text-center w-16 px-2"
            disabled={isLoading}
            inputMode="numeric"
          />
          <Button
            onClick={handleUpdate}
            disabled={!isValidQuantity || isLoading}
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
        {quantity && !isValidQuantity && (
          <div className="text-xs text-red-600 px-1">
            Please enter a positive integer
          </div>
        )}
      </div>
    </BasePopup>
  );
};
