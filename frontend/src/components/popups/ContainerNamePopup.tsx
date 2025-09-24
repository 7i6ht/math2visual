import React, { useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BasePopup } from "./BasePopup";
import { useDSLContext } from "@/contexts/DSLContext";
import { getContainerNameValue } from "@/hooks/useContainerNamePopup";

interface ContainerNamePopupProps {
  onClose: () => void;
  onUpdate: (newContainerName: string) => Promise<void>;
  dslPath: string;
}

export const ContainerNamePopup: React.FC<ContainerNamePopupProps> = ({
  onClose,
  onUpdate,
  dslPath,
}) => {
  const [containerName, setContainerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { componentMappings } = useDSLContext();

  // Initialize with current value from DSL context
  useEffect(() => {
    const currentValue = getContainerNameValue(componentMappings, dslPath) || "";
    setContainerName(currentValue);
  }, [dslPath, componentMappings]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Handle container name update
  const handleUpdate = async () => {
    if (!containerName.trim()) {
      toast.error("Please enter a container name");
      return;
    }

    // Don't update if value hasn't changed
    const currentValue = getContainerNameValue(componentMappings, dslPath) || "";
    if (containerName.trim() === currentValue) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(containerName.trim());
      onClose();
      toast.success(`Container name updated to "${containerName.trim()}"`);
    } catch (err) {
      console.error("Failed to update container name:", err);
      toast.error("Failed to update container name. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard events for popup
  const handlePopupKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && containerName.trim() && !isLoading) {
      event.preventDefault();
      handleUpdate();
    }
  };

  const isValidContainerName = containerName.trim().length > 0;

  return (
    <BasePopup
      onClose={onClose}
      onKeyDown={handlePopupKeyDown}
      className="w-fit max-w-[95vw]"
    >
      <div className="flex flex-col gap-2">
        {/* Input and Update Button */}
        <div className="flex gap-0 group focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:ring-offset-0 focus-within:border-ring rounded-md transition-all duration-200 border border-ring ring-[3px] ring-ring/50 ring-offset-0">
          <Input
            ref={inputRef}
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
            placeholder="Enter container name..."
            spellCheck={false}
            className="rounded-r-none border-r-0 h-9 text-sm focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-none touch-manipulation text-center w-20 px-2"
            disabled={isLoading}
          />
          <Button
            onClick={handleUpdate}
            disabled={!isValidContainerName || isLoading}
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
        {containerName && !isValidContainerName && (
          <div className="text-xs text-red-600 px-1">
            Please enter a container name
          </div>
        )}
      </div>
    </BasePopup>
  );
};
