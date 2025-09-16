import React, { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface BasePopupProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  children: ReactNode;
  className?: string;
}

export const BasePopup: React.FC<BasePopupProps> = ({
  isOpen,
  onClose,
  position,
  children,
  className = "min-w-[200px] max-w-[90vw] max-h-[90vh] w-[min(90vw,240px)]"
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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