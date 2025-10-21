// Custom hook for handling SVG responsiveness
import { useCallback, useMemo } from "react";

export const useSVGResponsive = () => {
  const toNumber = (value: string | null) => {
    if (!value) return null;
    const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : null;
  };

  const makeResponsive = useCallback((root: HTMLDivElement | null) => {
    if (!root) return;
    const svg = root.querySelector('svg');
    if (!svg) return;

    const hasViewBox = svg.hasAttribute('viewBox');
    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');

    // If no viewBox but width/height exist, create a viewBox so scaling works
    if (!hasViewBox) {
      const w = toNumber(widthAttr);
      const h = toNumber(heightAttr);
      if (w && h) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    // Base responsive settings
    svg.removeAttribute('height');
    svg.style.height = 'auto';
    svg.style.maxWidth = '100%';
    svg.style.display = 'block';
    svg.style.margin = '0 auto';
    if (!svg.getAttribute('preserveAspectRatio')) {
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    // Compute aspect ratio from viewBox (preferred) or width/height
    const vb = svg.getAttribute('viewBox');
    let vbW: number | null = null;
    let vbH: number | null = null;
    if (vb) {
      const parts = vb.split(/\s+/).map((v) => Number(v));
      if (parts.length === 4) {
        vbW = parts[2];
        vbH = parts[3];
      }
    }
    if (!vbW || !vbH) {
      vbW = toNumber(widthAttr);
      vbH = toNumber(heightAttr);
    }

    const containerWidth = root.clientWidth || root.getBoundingClientRect().width || 0;
    const clampPx = Math.round(window.innerHeight * 0.6); // 60vh

    if (containerWidth > 0 && vbW && vbH && vbW > 0) {
      const predictedHeight = containerWidth * (vbH / vbW);
      if (predictedHeight > clampPx) {
        const scale = clampPx / predictedHeight; // 0..1
        const widthPercent = Math.max(10, Math.min(100, Math.round(scale * 100)));
        svg.removeAttribute('width');
        svg.style.width = `${widthPercent}%`;
      } else {
        svg.removeAttribute('width');
        svg.style.width = '100%';
      }
    } else {
      // Fallback
      svg.removeAttribute('width');
      svg.style.width = '100%';
    }
  }, []);

  // Setup window resize listener that triggers makeResponsive on provided refs
  const setupResizeListener = useCallback((refs: Array<React.RefObject<HTMLDivElement | null>>) => {
    const onResize = () => {
      refs.forEach(ref => {
        if (ref.current) {
          makeResponsive(ref.current);
        }
      });
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [makeResponsive]);

  const returnValue = useMemo(() => ({
    makeResponsive,
    setupResizeListener
  }), [makeResponsive, setupResizeListener]);

  return returnValue;
};
