/**
 * Downloads SVG content as a file
 */
export const downloadSvg = (svgContent: string, filename: string): void => {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  
  // Clean up the URL object to free memory
  URL.revokeObjectURL(url);
};

/**
 * Generates a filename for visualization downloads
 */
export const generateVisualizationFilename = (type: 'formal' | 'intuitive'): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${type}-visualization-${timestamp}.svg`;
}; 