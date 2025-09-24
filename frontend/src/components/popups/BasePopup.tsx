import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useHighlightingContext } from '@/contexts/HighlightingContext';

interface BasePopupProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  onKeyDown?: (event: KeyboardEvent) => void;
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
  
}) => {
  const { currentTargetElement } = useHighlightingContext();
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<AdjustedPosition>(() => {
    // Initialize using currentTargetElement position if available
    if (currentTargetElement) {
      const targetRect = currentTargetElement.getBoundingClientRect();
      return {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2,
        transform: 'translate(-50%, -50%)'
      };
    }
    
    // Fallback to center if no target element
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      transform: 'translate(-50%, -50%)'
    };
  });


  // Calculate viewport-aware position
  useEffect(() => {
    const calculatePosition = () => {
      if (!popupRef.current) {
        return;
      }
      
      try {
        const rect = popupRef.current.getBoundingClientRect();
        const margin = 16;
        
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        
        // Use target element's current position instead of click position
        if (currentTargetElement) {
          const targetRect = currentTargetElement.getBoundingClientRect();
          // Use center of target element
          x = targetRect.left + targetRect.width / 2;
          y = targetRect.top + targetRect.height / 2;
        } else {
          // This should never happen when a popup is open - log for debugging
          console.warn('BasePopup: No target element available for positioning, centering popup');
        }
        
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        
        // Check if position would overflow viewport
        if (x - halfWidth < margin) {
          x = margin + halfWidth;
        } else if (x + halfWidth > window.innerWidth - margin) {
          x = window.innerWidth - margin - halfWidth;
        }
        
        if (y - halfHeight < margin) {
          y = margin + halfHeight;
        } else if (y + halfHeight > window.innerHeight - margin) {
          y = window.innerHeight - margin - halfHeight;
        }
        
        setAdjustedPosition({ x, y, transform: 'translate(-50%, -50%)' });
      } catch (error) {
        console.error('Error calculating popup position:', error);
      }
    };

    // Calculate position after DOM is rendered
    const rafId = requestAnimationFrame(() => {
      calculatePosition();
    });
    
    // Recalculate on window resize
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentTargetElement]);

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