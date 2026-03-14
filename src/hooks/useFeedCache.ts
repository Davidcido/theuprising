import { useRef, useCallback, useMemo } from "react";

const MEMORY_CACHE_SIZE = 100;
const STORAGE_KEY = "uprising_community_cache";
const STORAGE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * In-memory + localStorage feed cache.
 * Stores up to 100 posts in memory for instant re-renders.
 * Falls back to localStorage for cross-tab persistence.
 */
export function useFeedCache<T extends { id: string; _optimistic?: boolean }>(idField: keyof T = "id" as keyof T) {
  const memoryCache = useRef<T[]>([]);

  const getFromStorage = useCallback((): T[] | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const { posts, ts } = JSON.parse(raw);
      if (Date.now() - ts > STORAGE_TTL) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return posts;
    } catch {
      return null;
    }
  }, []);

  const getCached = useCallback((): T[] | null => {
    if (memoryCache.current.length > 0) return memoryCache.current;
    return getFromStorage();
  }, [getFromStorage]);

  const updateCache = useCallback((posts: T[]) => {
    // Only cache non-optimistic, non-repost posts
    const cacheable = posts
      .filter((p: any) => !p._optimistic && !String(p[idField]).startsWith("repost-"))
      .slice(0, MEMORY_CACHE_SIZE);

    memoryCache.current = cacheable;

    // Persist first page to localStorage
    try {
      const toStore = cacheable.slice(0, 15);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ posts: toStore, ts: Date.now() }));
    } catch {}
  }, [idField]);

  const clearCache = useCallback(() => {
    memoryCache.current = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // Return a stable object reference to prevent unnecessary re-renders
  // in consumers that include this in dependency arrays
  return useMemo(() => ({ getCached, updateCache, clearCache }), [getCached, updateCache, clearCache]);
}
