import { useState, useEffect } from 'react';

export type ScreenSizeCategory = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ViewportDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
  isShortScreen: boolean; // < 650px height
  isMobile: boolean; // < 640px
  isTablet: boolean; // 640px - 1024px
  isDesktop: boolean; // >= 1024px
  category: ScreenSizeCategory;
  pixelRatio: number;
}

/**
 * Automatically computes and monitors viewport dimensions on connection and resize.
 * Injects responsive CSS custom properties into <html> for seamless auto-scaling.
 */
export function useAutoViewport(): ViewportDimensions {
  const getDimensions = (): ViewportDimensions => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    let category: ScreenSizeCategory = 'md';
    if (width < 420) category = 'xs';
    else if (width < 640) category = 'sm';
    else if (width < 1024) category = 'md';
    else if (width < 1280) category = 'lg';
    else if (width < 1536) category = 'xl';
    else category = '2xl';

    return {
      width,
      height,
      isLandscape: width > height,
      isShortScreen: height < 650,
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      category,
      pixelRatio,
    };
  };

  const [dimensions, setDimensions] = useState<ViewportDimensions>(getDimensions);

  useEffect(() => {
    const updateViewport = () => {
      const dims = getDimensions();
      setDimensions(dims);

      // Inset CSS variables into document root for fluid UI
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.style.setProperty('--screen-width', `${dims.width}px`);
        root.style.setProperty('--screen-height', `${dims.height}px`);
        root.style.setProperty('--vh', `${dims.height * 0.01}px`);
        root.setAttribute('data-screen-category', dims.category);
        root.setAttribute('data-orientation', dims.isLandscape ? 'landscape' : 'portrait');
        root.setAttribute('data-short-screen', dims.isShortScreen ? 'true' : 'false');
      }
    };

    // Execute immediately on connection / mount
    updateViewport();

    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
      }
    };
  }, []);

  return dimensions;
}
