import React, { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BasePopup } from "./BasePopup";
import { useAnalytics } from "@/hooks/useAnalytics";

interface EntityQuantityPopupProps {
  onClose: () => void;
  onUpdate: (newQuantity: number) => Promise<void>;
  initialQuantity: number;
}

export const EntityQuantityPopup: React.FC<EntityQuantityPopupProps> = ({
  onClose,
  onUpdate,
  initialQuantity,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity.toString());
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { trackEntityQuantityPopupType, trackPopupSubmit, isAnalyticsEnabled } = useAnalytics();

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
      if (isAnalyticsEnabled) {
        trackEntityQuantityPopupType(value);
      }
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
    if (numericQuantity === initialQuantity) {
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
      if (isAnalyticsEnabled) {
        trackPopupSubmit('entity_quantity', quantity, 'keyboard');
      }
      handleUpdate();
    }
  };

  const isValidQuantity = quantity && /^[1-9]\d*$/.test(quantity);

  return (
    <BasePopup
      onClose={onClose}
      onKeyDown={handlePopupKeyDown}
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
            className="rounded-r-none border-r-0 popup-button-responsive-height responsive-text-font-size focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation text-center px-2"
            disabled={isLoading}
            inputMode="numeric"
          />
          <Button
            onClick={() => {
              if (isAnalyticsEnabled) {
                trackPopupSubmit('entity_quantity', quantity);
              }
              handleUpdate();
            }}
            disabled={!isValidQuantity || isLoading}
            className="px-2 rounded-l-none popup-button-responsive-height responsive-text-font-size !text-primary-foreground focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation flex-shrink-0"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full responsive-text-font-size border-b-2 border-white" />
            ) : (
              <ArrowRight className="responsive-smaller-icon-font-size"/>
            )}
          </Button>
        </div>

        {/* Validation hint */}
        {quantity && !isValidQuantity && (
          <div className="text-xs text-red-600 px-1 responsive-text-font-size">
            Please enter a positive integer
          </div>
        )}
      </div>
    </BasePopup>
  );
};
