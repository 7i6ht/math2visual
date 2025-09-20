import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SVGSearchPopup } from "./SVGSearchPopup";
import { SVGUploadPopup } from "./SVGUploadPopup";

interface SVGActionMenuProps {
  onClosePopup: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;
  targetElement: Element;
}

export const SVGActionMenu: React.FC<SVGActionMenuProps> = ({
  onClosePopup,
  onEmbeddedSVGChange,
  targetElement,
}) => {
  const [activePopup, setActivePopup] = useState<"search" | "upload" | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClosePopup = useCallback(() => {
    setActivePopup(null);
    onClosePopup();
  }, [onClosePopup]);

  useEffect(() => {
    const handler = () => {
      if (!activePopup) {
        onClosePopup();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activePopup, onClosePopup]);


  const rect = targetElement.getBoundingClientRect();
  return (
    <>
      {/* Action Menu Dropdown */}
      {!activePopup && (
        <div
          ref={containerRef}
          className="fixed z-[60]"
          style={{
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
            transform: "translate(-50%, -50%)",
          }}
        >
          <DropdownMenu open={true}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 px-2 opacity-0 pointer-events-none"
              >
                •
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[140px] sm:min-w-[160px] p-1">
              <DropdownMenuItem
                className="cursor-pointer px-3 py-2 sm:px-2 sm:py-1.5 text-sm touch-manipulation"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setActivePopup("search")}
              >
                <Search className="h-4 w-4 mr-2 flex-shrink-0" /> Search
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer px-3 py-2 sm:px-2 sm:py-1.5 text-sm touch-manipulation"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setActivePopup("upload")}
              >
                <Upload className="h-4 w-4 mr-2 flex-shrink-0" /> Upload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Search Popup */}
      {activePopup === "search" && (
        <SVGSearchPopup
          onClose={handleClosePopup}
          onSelect={onEmbeddedSVGChange}
          targetElement={targetElement}
        />
      )}

      {/* Upload Popup */}
      {activePopup === "upload" && (
        <SVGUploadPopup
          onClose={handleClosePopup}
          onUpload={onEmbeddedSVGChange}
          targetElement={targetElement}
        />
      )}
    </>
  );
};

export default SVGActionMenu;
