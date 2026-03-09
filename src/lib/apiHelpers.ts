import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TIMEOUT = 8000; // 8 seconds

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the given time, it rejects with a timeout error.
 */
export function withTimeout<T>(promise: Promise<T>, ms = DEFAULT_TIMEOUT): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(
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
 * Get session with timeout — never blocks forever.
 */
export async function getSessionSafe(timeoutMs = 5000) {
  try {
    const { data: { session } } = await withTimeout(supabase.auth.getSession(), timeoutMs);
    return session;
  } catch {
    return null;
  }
}
