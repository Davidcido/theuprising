import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TIMEOUT = 8000; // 8 seconds

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the given time, it rejects with a timeout error.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms = DEFAULT_TIMEOUT): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    Promise.resolve(promise).then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * Safe Supabase query wrapper — returns { data, error } and never throws.
 * Adds timeout protection.
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T; error: any }>,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<{ data: T | null; error: string | null; timedOut: boolean }> {
  try {
    const { data, error } = await withTimeout(queryFn(), timeoutMs);
    if (error) return { data: null, error: error.message || "Query failed", timedOut: false };
    return { data, error: null, timedOut: false };
  } catch (e: any) {
    const timedOut = e.message === "Request timed out";
    return { data: null, error: e.message, timedOut };
  }
}

/**
 * Get session with caching — avoids redundant getSession calls.
 * Caches the session in memory for rapid access.
 */
let _cachedSession: any = null;
let _sessionFetchPromise: Promise<any> | null = null;
let _sessionFetchedAt = 0;
const SESSION_CACHE_TTL = 30000; // 30 seconds

export async function getSessionSafe(timeoutMs = 5000) {
  const now = Date.now();
  
  // Return cached session if fresh
  if (_cachedSession && (now - _sessionFetchedAt) < SESSION_CACHE_TTL) {
    return _cachedSession;
  }

  // Deduplicate concurrent requests
  if (_sessionFetchPromise) {
    return _sessionFetchPromise;
  }

  _sessionFetchPromise = (async () => {
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), timeoutMs);
      _cachedSession = session;
      _sessionFetchedAt = Date.now();
      return session;
    } catch {
      return _cachedSession; // Return stale if available
    } finally {
      _sessionFetchPromise = null;
    }
  })();

  return _sessionFetchPromise;
}

// Listen for auth changes to keep cache fresh + clear on logout
supabase.auth.onAuthStateChange((event, session) => {
  _cachedSession = session;
  _sessionFetchedAt = Date.now();
  if (event === "SIGNED_OUT") {
    _cachedSession = null;
    _sessionFetchedAt = 0;
    _profileCache.clear();
  }
});

/**
 * Profile cache — avoids refetching profiles on every component mount.
 */
const _profileCache = new Map<string, { data: any; ts: number }>();
const PROFILE_CACHE_TTL = 60000; // 1 minute

export async function getCachedProfile(userId: string) {
  const cached = _profileCache.get(userId);
  if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) {
    return cached.data;
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) {
    _profileCache.set(userId, { data, ts: Date.now() });
  }
  return data;
}

export function invalidateProfileCache(userId: string) {
  _profileCache.delete(userId);
}

/**
 * Batch profile fetcher — fetches multiple profiles in one query.
 */
export async function batchFetchProfiles(userIds: string[]) {
  const unique = [...new Set(userIds)];
  const uncached = unique.filter(id => {
    const cached = _profileCache.get(id);
    return !cached || Date.now() - cached.ts >= PROFILE_CACHE_TTL;
  });

  if (uncached.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, created_at, online_status, last_seen_at")
      .in("user_id", uncached);
    if (data) {
      for (const p of data) {
        _profileCache.set(p.user_id, { data: p, ts: Date.now() });
      }
    }
  }

  return unique.map(id => _profileCache.get(id)?.data || null).filter(Boolean);
}
