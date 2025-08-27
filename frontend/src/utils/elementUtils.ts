/**
 * Utility functions for SVG element type detection and classification
 */

/**
 * Check if an element is a text element
 * @param el - The element to check
 * @returns true if the element is a text element
 */
export const isTextElement = (el: Element): boolean => {
  return el.tagName.toLowerCase() === 'text';
};

/**
 * Check if an element is an operation element (group with operation DSL path)
 * @param el - The element to check
 * @returns true if the element is an operation element
 */
export const isOperationElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'g') return false;
  
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return path.includes('/operation') || path === 'operation';
};

/**
 * Check if an element is a box element (rectangle)
 * @param el - The element to check
 * @returns true if the element is a box element
 */
export const isBoxElement = (el: Element): boolean => {
  return el.tagName.toLowerCase() === 'rect';
};

/**
 * Get the DSL path from an SVG element
 * @param el - The SVG element
 * @returns The DSL path or null if not found
 */
export const getDslPath = (el: SVGElement): string | null => {
  return el.getAttribute('data-dsl-path');
};

/**
 * Set cursor style for interactive elements
 * @param el - The SVG element
 * @param cursor - The cursor style (default: 'pointer')
 */
export const setCursorStyle = (el: SVGElement, cursor: string = 'pointer'): void => {
  el.style.cursor = cursor;
};
