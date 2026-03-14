import { useState, useRef, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 5 || refreshing) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullingRef.current || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta < 0) {
      setPullDistance(0);
      return;
    }
    // Dampen the pull distance
    const dampened = Math.min(MAX_PULL, delta * 0.4);
    setPullDistance(dampened);
    if (dampened > 10) {
      e.preventDefault();
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(1, pullDistance / THRESHOLD);

  return (
    <div ref={containerRef}>
      {/* Pull indicator */}
      <div
        className="flex justify-center items-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: pullDistance > 5 ? pullDistance : 0 }}
      >
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          style={{
            opacity: progress,
            transform: `scale(${0.5 + progress * 0.5})`,
          }}
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
              transition: "transform 0.1s ease-out",
            }}
          />
          <span>{refreshing ? "Refreshing…" : progress >= 1 ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
