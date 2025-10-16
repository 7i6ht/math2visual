import React, { useCallback, useState } from "react";
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

interface SVGActionMenuProps {
  onClosePopup: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;
}

export const SVGActionMenu: React.FC<SVGActionMenuProps> = ({
  onClosePopup,
  onEmbeddedSVGChange,
}) => {
  const [activePopup, setActivePopup] = useState<"search" | "upload" | null>(
    null
  );

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
            <DropdownMenuContent align="center" className="w-fit min-w-0 px-1 py-1 md:px-2 md:py-2 lg:px-3 lg:py-3">
              <DropdownMenuItem
                className="cursor-pointer text-font-size touch-manipulation flex items-center gap-1"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setActivePopup("search")}
              >
                <Search className="smaller-icon-font-size flex-shrink-0" /> Search
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-font-size touch-manipulation flex items-center gap-1"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setActivePopup("upload")}
              >
                <Upload className="smaller-icon-font-size flex-shrink-0" /> Upload
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
