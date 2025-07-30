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
 * Converts SVG to PNG and downloads it
 */
export const downloadPng = (svgContent: string, filename: string): void => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    // Clean up the SVG URL
    URL.revokeObjectURL(svgUrl);
    
    // Set canvas size to match image
    canvas.width = img.width || 800;
    canvas.height = img.height || 600;
    
    // Draw the image onto the canvas
    ctx?.drawImage(img, 0, 0);
    
    // Convert canvas to PNG blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };
  
  // Convert SVG to data URL and load into image
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  img.src = svgUrl;
};

/**
 * Converts SVG to PDF and downloads it
 */
export const downloadPdf = async (svgContent: string, filename: string): Promise<void> => {
  try {
    // Dynamic import of jsPDF to avoid bundling if not used
    const jsPDF = (await import('jspdf')).default;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          // Clean up the SVG URL
          URL.revokeObjectURL(svgUrl);
          
          // Set canvas size
          canvas.width = img.width || 800;
          canvas.height = img.height || 600;
          
          // Draw the image onto the canvas
          ctx?.drawImage(img, 0, 0);
          
          // Convert canvas to data URL
          const imgData = canvas.toDataURL('image/png');
          
          // Create PDF
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          
          // Add image to PDF
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          
          // Download PDF
          pdf.save(filename);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load SVG'));
      
      // Convert SVG to data URL and load into image
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
    });
  } catch (error) {
    console.error('Error loading jsPDF:', error);
    throw new Error('PDF functionality requires jsPDF library');
  }
};

/**
 * Downloads visualization in the specified format
 */
export const downloadVisualization = async (
  svgContent: string, 
  format: 'svg' | 'png' | 'pdf', 
  type: 'formal' | 'intuitive'
): Promise<void> => {
  const filename = generateVisualizationFilename(type, format);
  
  switch (format) {
    case 'svg':
      downloadSvg(svgContent, filename);
      break;
    case 'png':
      downloadPng(svgContent, filename);
      break;
    case 'pdf':
      await downloadPdf(svgContent, filename);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};

/**
 * Generates a filename for visualization downloads
 */
export const generateVisualizationFilename = (
  type: 'formal' | 'intuitive', 
  format: 'svg' | 'png' | 'pdf' = 'svg'
): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${type}-visualization-${timestamp}.${format}`;
}; 