import { useEffect, useState } from 'react';

/** Below this parent width the app switches to the phone/tablet layout. */
export const COMPACT_LAYOUT_BREAKPOINT = 1024;

/**
 * Width of the Home Assistant window hosting the panel. C.A.F.E. runs in an
 * iframe, so the iframe's own width is not what the user is looking at.
 */
function readParentWidth(): number {
  const win = typeof window !== 'undefined' ? (window.parent ?? window) : undefined;
  return win?.innerWidth ?? COMPACT_LAYOUT_BREAKPOINT;
}

export function useCompactLayout(): { parentWidth: number; isCompactLayout: boolean } {
  const [parentWidth, setParentWidth] = useState(readParentWidth);

  useEffect(() => {
    const win = window.parent ?? window;
    const handleResize = () => setParentWidth(win.innerWidth);

    win.addEventListener('resize', handleResize);
    return () => win.removeEventListener('resize', handleResize);
  }, []);

  return { parentWidth, isCompactLayout: parentWidth < COMPACT_LAYOUT_BREAKPOINT };
}
