import React, { useCallback, useState, useLayoutEffect } from "react";
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
import { BasePopup } from "./BasePopup";
import { useHighlightingContext } from "@/contexts/HighlightingContext";

interface SVGActionMenuProps {
  visualType: 'formal' | 'intuitive';
  visualElementPath: string;
  onClosePopup: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;
}

export const SVGActionMenu: React.FC<SVGActionMenuProps> = ({
  visualType,
  visualElementPath,
  onClosePopup,
  onEmbeddedSVGChange,
}) => {
  const [activePopup, setActivePopup] = useState<"search" | "upload" | null>(
    null
  );

  const { setCurrentTargetElement } = useHighlightingContext();

  const recalcAndSetTargetElement = useCallback(() => {
    const escaped = CSS.escape(visualElementPath);
    const elements = document.querySelectorAll(`svg[data-dsl-element-path="${escaped}"]`);
    if (elements.length > 0) {
      const index = visualType === 'intuitive' && elements.length > 1 ? 1 : 0;
      setCurrentTargetElement(elements[index]);
    }
  }, [visualElementPath, setCurrentTargetElement, visualType]);

  // Ensure target is recalculated before the popup renders/paints
  useLayoutEffect(() => {
    recalcAndSetTargetElement();
  }, [activePopup, recalcAndSetTargetElement]);
  

  const handleClosePopup = useCallback(() => {
    setActivePopup(null);
    onClosePopup();
  }, [onClosePopup]);

  return (
    <>
      {/* Action Menu Dropdown */}
      {!activePopup && (
        <BasePopup onClose={onClosePopup} className="p-0 !bg-transparent border-none shadow-none backdrop-blur-0">
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
        </BasePopup>
      )}

      {/* Search Popup */}
      {activePopup === "search" && (
        <SVGSearchPopup
          onClose={handleClosePopup}
          onSelect={onEmbeddedSVGChange}
        />
      )}

      {/* Upload Popup */}
      {activePopup === "upload" && (
        <SVGUploadPopup
          onClose={handleClosePopup}
          onUpload={onEmbeddedSVGChange}
        />
      )}
    </>
  );
};

export default SVGActionMenu;
