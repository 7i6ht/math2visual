import React, { useRef, useEffect, useState } from 'react';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';

interface HighlightableTextareaProps extends React.ComponentProps<typeof Textarea> {
  highlightRanges?: Array<[number, number]>;
}

export const HighlightableTextarea = React.forwardRef<
  HTMLTextAreaElement,
  HighlightableTextareaProps
>(({ highlightRanges = [], className, value, ...props }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightLayerRef = useRef<HTMLDivElement | null>(null);
  const [textareaStyle, setTextareaStyle] = useState<React.CSSProperties>({});

  // Sync textarea styles with highlight layer
  useEffect(() => {
    if (textareaRef.current) {
      const computedStyle = window.getComputedStyle(textareaRef.current);
      setTextareaStyle({
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        lineHeight: computedStyle.lineHeight,
        padding: computedStyle.padding,
        border: computedStyle.border,
        borderRadius: computedStyle.borderRadius,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflow: 'hidden',
      });
    }
  }, []);

  // Auto-scroll to highlighted ranges when they change
  useEffect(() => {
    if (textareaRef.current && highlightRanges.length > 0) {
      const textarea = textareaRef.current;
      const text = value || '';
      
      // Get the first highlight range
      const [start] = highlightRanges[0];

      if (typeof text === 'string' && start >= 0 && start < text.length) {
        // Calculate which line the highlight starts on
        const textBeforeHighlight = text.substring(0, start);
        const lines = textBeforeHighlight.split('\n');
        const lineNumber = lines.length - 1;
        
        // Calculate approximate line height
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
        
        // Calculate scroll position to center the highlighted line
        const targetScrollTop = Math.max(0, lineNumber * lineHeight - textarea.clientHeight / 2);
        
        // Smooth scroll to the target position
        textarea.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [highlightRanges, value]);

  // Create highlighted content
  const createHighlightedContent = () => {
    if (!value || typeof value !== 'string' || highlightRanges.length === 0) {
      return value || '';
    }

    let content = value;
    const ranges = [...highlightRanges].sort((a, b) => a[0] - b[0]);
    let offset = 0;

    ranges.forEach(([start, end]) => {
      if (start >= 0 && end <= content.length && start < end) {
        const adjustedStart = start + offset;
        const adjustedEnd = end + offset;
        
        const before = content.slice(0, adjustedStart);
        const highlighted = content.slice(adjustedStart, adjustedEnd);
        const after = content.slice(adjustedEnd);
        
        const highlightSpan = `<span style="background-color: rgba(59, 130, 246, 0.3); padding: 1px 2px; border-radius: 2px;">${highlighted}</span>`;
        
        content = before + highlightSpan + after;
        offset += highlightSpan.length - highlighted.length;
      }
    });

    return content;
  };

  const combinedRef = (node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <div className="relative">
      {/* Highlight layer - positioned behind textarea */}
      <div
        ref={highlightLayerRef}
        className={cn(
          "absolute top-0 left-0 pointer-events-none text-transparent",
          className
        )}
        style={{
          ...textareaStyle,
          zIndex: 1,
          background: 'transparent',
          border: 'none',
          color: 'transparent',
          resize: 'none',
        }}
        dangerouslySetInnerHTML={{
          __html: String(createHighlightedContent() || ''),
        }}
      />
      
      {/* Actual textarea - positioned on top */}
      <Textarea
        ref={combinedRef}
        value={value}
        className={cn("relative bg-transparent", className)}
        style={{ zIndex: 2 }}
        {...props}
      />
    </div>
  );
});

HighlightableTextarea.displayName = 'HighlightableTextarea';
