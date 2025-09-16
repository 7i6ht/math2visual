import React, { useEffect, useRef, useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SVGSearchPopup } from './SVGSearchPopup';
import { SVGUploadPopup } from './SVGUploadPopup';

interface SVGActionMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClosePopup: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;
}

export const SVGActionMenu: React.FC<SVGActionMenuProps> = ({ 
  isOpen, 
  position, 
  onClosePopup, 
  onEmbeddedSVGChange 
}) => {
  const [activePopup, setActivePopup] = useState<'search' | 'upload' | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClosePopup = () => {
    setActivePopup(null);
    onClosePopup();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        setActivePopup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClosePopup]);
  
  return (
    <>
      {/* Action Menu Dropdown */}
      {isOpen && !activePopup && (
        <div
          className="fixed z-[60]"
          style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
        >
          <DropdownMenu open={true}>
            <DropdownMenuTrigger asChild>
              <Button ref={triggerRef} variant="outline" className="h-8 px-2 opacity-0 pointer-events-none">
                •
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[140px]">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setActivePopup('search')}>
                <Search className="h-4 w-4 mr-2" /> Search
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setActivePopup('upload')}>
                <Upload className="h-4 w-4 mr-2" /> Upload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Search Popup */}
      <SVGSearchPopup
        isOpen={isOpen && activePopup === 'search'}
        onClose={handleClosePopup}
        onSelect={onEmbeddedSVGChange}
        position={position}
      />

      {/* Upload Popup */}
      <SVGUploadPopup
        isOpen={isOpen && activePopup === 'upload'}
        onClose={handleClosePopup}
        onUpload={onEmbeddedSVGChange}
        position={position}
      />
    </>
  );
};

export default SVGActionMenu;
