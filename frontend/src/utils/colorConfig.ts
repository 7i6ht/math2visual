/**
 * Global color configuration for visual highlighting
 * Centralized color management for consistent theming
 */

export const HIGHLIGHT_COLORS = {
  // Primary blue for all interactive elements
  PRIMARY: 'rgba(59, 130, 246, 0.9)', // #3b82f6 with 90% opacity
  
  // Variations for different element types
  BOX: 'rgba(59, 130, 246, 0.5)',     // Lighter for container borders
  TEXT: 'rgba(59, 130, 246, 0.8)',    // Medium for text elements
  OPERATION: 'rgba(59, 130, 246, 0.8)', // Medium for operations
  SVG: 'rgba(59, 130, 246, 0.9)',     // Full opacity for SVG elements
} as const;

// Type for type safety
export type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

/**
 * Get highlight color with optional opacity override
 */
export const getHighlightColor = (key: HighlightColorKey, opacity?: number): string => {
  const baseColor = HIGHLIGHT_COLORS[key];
  
  if (opacity !== undefined) {
    // Extract RGB values and apply custom opacity
    const rgbMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  
  return baseColor;
};

/**
 * Generate drop-shadow filter with specified color
 */
export const createDropShadow = (color: string, blurRadius: number = 6): string => {
  return `drop-shadow(0 0 ${blurRadius}px ${color})`;
};
