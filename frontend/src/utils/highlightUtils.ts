import { isTextElement, isOperationElement, isBoxElement, isEmbeddedSvgElement, isContainerTypeSvgElement, isContainerNameElement } from './elementUtils';

/**
 * Clear functions for different SVG element types
 * Each function resets the element's visual styles to their default state
 */
export const clearFunctions = [
  {
    test: isContainerNameElement,
    clear: (el: SVGElement) => {
      el.style.fill = 'black';
      el.style.fontWeight = 'normal';
      el.style.filter = '';
    }
  },
  {
    test: isTextElement,
    clear: (el: SVGElement) => {
      el.style.fill = 'white';
      el.style.filter = '';
    }
  },
  {
    test: isOperationElement,
    clear: (el: SVGElement) => {
      el.style.filter = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.vectorEffect = '';
    }
  },
  {
    test: isBoxElement,
    clear: (el: SVGElement) => {
      el.style.stroke = 'black';
      el.style.strokeWidth = '1';
      el.style.filter = '';
    }
  },
  {
    test: isEmbeddedSvgElement,
    clear: (el: SVGElement) => {
      el.style.filter = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.vectorEffect = '';
    }
  },
  {
    test: isContainerTypeSvgElement,
    clear: (el: SVGElement) => {
      el.style.filter = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.vectorEffect = '';
    }
  }
] as const;

/**
 * Clear visual highlights from an SVG element
 * Automatically detects the element type and applies the appropriate clear function
 */
export const clearElementHighlight = (svgElem: SVGElement): void => {
  const clearFunction = clearFunctions.find(({ test }) => test(svgElem));
  clearFunction?.clear(svgElem);
};
