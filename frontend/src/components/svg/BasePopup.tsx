import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface BasePopupProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  onKeyDown?: (event: KeyboardEvent) => void;
  targetElement: Element; // Element to track and position relative to
}

interface AdjustedPosition {
  x: number;
  y: number;
  transform: string;
}

export const BasePopup: React.FC<BasePopupProps> = ({
  onClose,
  children,
  className = "min-w-[200px] max-w-[95vw] max-h-[90vh] w-[min(95vw,320px)] sm:w-[min(90vw,280px)]",
  onKeyDown,
  targetElement
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<AdjustedPosition>(() => {
    const rect = targetElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      transform: 'translate(-50%, -50%)'
    };
  });

  // Calculate viewport-aware position
  useEffect(() => {
    const calculatePosition = () => {
      if (!popupRef.current) return;

      const rect = popupRef.current.getBoundingClientRect();
      const margin = 16;
      
      // Get target position from element
      const targetRect = targetElement.getBoundingClientRect();
      const targetX = targetRect.left + targetRect.width / 2;
      const targetY = targetRect.top + targetRect.height / 2;
      
      let { x, y } = { x: targetX, y: targetY };
      let transformX = '-50%';
      let transformY = '-50%';
      
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      
      // Check if centered position would overflow
      if (targetX - halfWidth < margin) {
        x = margin;
        transformX = '0%';
      } else if (targetX + halfWidth > window.innerWidth - margin) {
        x = window.innerWidth - margin;
        transformX = '-100%';
      }
      
      if (targetY - halfHeight < margin) {
        y = margin;
        transformY = '0%';
      } else if (targetY + halfHeight > window.innerHeight - margin) {
        y = window.innerHeight - margin;
        transformY = '-100%';
      }
      
      setAdjustedPosition({ x, y, transform: `translate(${transformX}, ${transformY})` });
    };

    // Calculate position immediately - DOM is ready after useEffect
    calculatePosition();
    
    // Recalculate on window resize
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [targetElement]);

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
      className={`fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto p-1 transition-all duration-200 ease-out ${className}`}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: adjustedPosition.transform,
      }}
    >
      {children}
    </div>
  );
};