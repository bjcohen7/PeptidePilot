import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance in px to register as a swipe. Default: 60 */
  threshold?: number;
  /** Maximum vertical deviation allowed before ignoring as a scroll. Default: 80 */
  verticalThreshold?: number;
}

/**
 * Attaches touch-based swipe detection to a container element.
 * Returns ref + event handlers to spread onto the target element.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  verticalThreshold = 80,
}: SwipeHandlers) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      // Ignore if vertical movement dominates (user is scrolling)
      if (Math.abs(deltaY) > verticalThreshold) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (deltaX < -threshold) {
        onSwipeLeft?.();
      } else if (deltaX > threshold) {
        onSwipeRight?.();
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [onSwipeLeft, onSwipeRight, threshold, verticalThreshold]
  );

  return { onTouchStart, onTouchEnd };
}
