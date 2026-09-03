import { useState, useEffect } from 'react';

export type ScreenSizeCategory = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

export interface ScreenSizeState {
  width: number;
  height: number;
  category: ScreenSizeCategory;
  isMobile: boolean;      // <= 640px
  isTablet: boolean;      // 641px - 1024px
  isDesktop: boolean;     // > 1024px
  isSmallScreen: boolean; // <= 768px (Mobile & Compact Tablets)
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

function getScreenSizeState(): ScreenSizeState {
  if (typeof window === 'undefined') {
    return {
      width: 1200,
      height: 800,
      category: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isSmallScreen: false,
      isTouch: false,
      orientation: 'landscape',
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  let category: ScreenSizeCategory = 'desktop';
  if (width <= 640) {
    category = 'mobile';
  } else if (width <= 1024) {
    category = 'tablet';
  } else if (width <= 1440) {
    category = 'desktop';
  } else {
    category = 'ultrawide';
  }

  const isMobile = width <= 640;
  const isTablet = width > 640 && width <= 1024;
  const isDesktop = width > 1024;
  const isSmallScreen = width <= 768;
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const orientation = width >= height ? 'landscape' : 'portrait';

  return {
    width,
    height,
    category,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    isTouch,
    orientation,
  };
}

export function useScreenSize(): ScreenSizeState {
  const [screenSize, setScreenSize] = useState<ScreenSizeState>(getScreenSizeState);

  useEffect(() => {
    let timeoutId: any = null;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScreenSize(getScreenSizeState());
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return screenSize;
}
