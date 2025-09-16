import React, { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface BasePopupProps {
  onClose: () => void;
  position: { x: number; y: number };
  children: ReactNode;
  className?: string;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export const BasePopup: React.FC<BasePopupProps> = ({
  onClose,
  position,
  children,
  className = "min-w-[200px] max-w-[90vw] max-h-[90vh] w-[min(90vw,240px)]",
  onKeyDown
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDownEvent = (event: KeyboardEvent) => {
      // First handle built-in keys
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      
      // Then call custom handler if provided
      if (onKeyDown) {
        onKeyDown(event);
      }
    };

    document.addEventListener('keydown', handleKeyDownEvent);
    return () => document.removeEventListener('keydown', handleKeyDownEvent);
  }, [onClose, onKeyDown]);

  return (
    <div
      ref={popupRef}
      className={`fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto p-1 ${className}`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {children}
    </div>
  );
};