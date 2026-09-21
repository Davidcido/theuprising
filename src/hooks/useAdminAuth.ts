import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Read the persisted Supabase session directly from storage so the admin
// guard can resolve instantly, even if the auth client is slow or stuck.
const readStoredUser = (): User | null => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const u = parsed?.user ?? parsed?.currentSession?.user ?? null;
        if (u) return u as User;
      }
    }
  } catch {
    // ignore malformed storage
  }
  return null;
};

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;
    const stored = readStoredUser();

    const finish = (u: User | null) => {
      if (settled) return;
      settled = true;
      setUser(u);
      setLoading(false);
    };

    // Hard fallback: never stay on the verification screen longer than 1.5s.
    const timeout = setTimeout(() => {
      console.log("[admin] auth timeout fallback", stored?.email);
      finish(stored);
    }, 1500);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeout);
      finish(session?.user ?? stored);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        finish(session?.user ?? stored);
      })
      .catch((error) => {
        console.error("[admin] session lookup failed", error);
        clearTimeout(timeout);
        finish(stored);
      });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut({ scope: "global" });
    setUser(null);
    const sid = localStorage.getItem("uprising_session_id");
    localStorage.clear();
    sessionStorage.clear();
    if (sid) localStorage.setItem("uprising_session_id", sid);
    window.location.href = "/";
  };

  return {
    user,
    isAuthenticated: !!user,
    isAdmin: !!user,
    loading,
    logout,
  };
};
