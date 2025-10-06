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
  const tag = el.tagName.toLowerCase();
  if (tag !== 'rect') return false;
  
  // Exclude result containers from being treated as regular boxes
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return !path.endsWith('result_container');
};

/**
 * Check if an element is an embedded SVG element (entity_type)
 * @param el - The element to check
 * @returns true if the element is an embedded SVG element
 */
export const isEmbeddedSvgElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'svg') return false;
  
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return path.includes('/entity_type');
};

/**
 * Check if an element is a container type SVG element (container_type)
 * @param el - The element to check
 * @returns true if the element is a container type SVG element
 */
export const isContainerTypeSvgElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'svg') return false;
  
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return path.includes('/container_type');
};

/**
 * Check if an element is an attribute type SVG element (attr_type)
 * @param el - The element to check
 * @returns true if the element is an attribute type SVG element
 */
export const isAttrTypeSvgElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'svg') return false;
  
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return path.includes('/attr_type');
};

/**
 * Check if an element is a container name text element (container_name)
 * @param el - The element to check
 * @returns true if the element is a container name text element
 */
export const isContainerNameElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'text') return false;
  
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return path.includes('/container_name');
};

/**
 * Check if an element is an attribute name text element (attr_name)
 * @param el - The element to check
 * @returns true if the element is an attribute name text element
 */
export const isAttrNameElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'text') return false;
  
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return path.includes('/attr_name');
};

/**
 * Check if an element is a result container box element (result_container)
 * @param el - The element to check
 * @returns true if the element is a result container box element
 */
export const isResultContainerElement = (el: Element): boolean => {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'rect') return false;
  
  const path = (el as SVGElement).getAttribute('data-dsl-path') || '';
  return path.endsWith('result_container');
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
