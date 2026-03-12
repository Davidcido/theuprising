import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/**
 * Lightweight feed virtualization hook.
 * Only renders posts within the visible window + a generous buffer.
 * Keeps DOM size small for long feeds on mobile.
 */
export function useVirtualFeed<T extends { id: string }>(
  items: T[],
  options: {
    estimatedItemHeight?: number;
    overscan?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    estimatedItemHeight = 400,
    overscan = 5,
    enabled = true,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );
  const rafRef = useRef<number>(0);
  const lastScrollRef = useRef(0);

  // Throttled scroll handler using rAF
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      if (rafRef.current) return; // already scheduled
      rafRef.current = requestAnimationFrame(() => {
        const st = window.scrollY || document.documentElement.scrollTop;
        // Only update if scrolled more than 50px to reduce renders
        if (Math.abs(st - lastScrollRef.current) > 50) {
          lastScrollRef.current = st;
          setScrollTop(st);
        }
        rafRef.current = 0;
      });
    };

    const handleResize = () => {
      setContainerHeight(window.innerHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  const visibleRange = useMemo(() => {
    if (!enabled) return { start: 0, end: items.length };

    const viewStart = scrollTop;
    const viewEnd = scrollTop + containerHeight;

    // Estimate which items are visible (assuming uniform height)
    const startIdx = Math.max(0, Math.floor(viewStart / estimatedItemHeight) - overscan);
    const endIdx = Math.min(
      items.length,
      Math.ceil(viewEnd / estimatedItemHeight) + overscan
    );

    return { start: startIdx, end: endIdx };
  }, [scrollTop, containerHeight, items.length, estimatedItemHeight, overscan, enabled]);

  const virtualItems = useMemo(() => {
    if (!enabled) return items;
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange, enabled]);

  // Spacers for maintaining scroll position
  const topSpacer = enabled ? visibleRange.start * estimatedItemHeight : 0;
  const bottomSpacer = enabled
    ? Math.max(0, (items.length - visibleRange.end) * estimatedItemHeight)
    : 0;

  return {
    virtualItems,
    topSpacer,
    bottomSpacer,
    totalHeight: items.length * estimatedItemHeight,
    visibleRange,
  };
}
