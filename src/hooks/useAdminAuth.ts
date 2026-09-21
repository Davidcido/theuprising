import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveAccess = (currentUser: User | null) => {
      console.log("[dbg] resolveAccess", currentUser?.email);
      setUser(currentUser);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[dbg] admin auth event", _event);
      resolveAccess(session?.user ?? null);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log("[dbg] getSession resolved", session?.user?.email);
        resolveAccess(session?.user ?? null);
      })
      .catch((error) => {
        console.error("[admin] session lookup failed", error);
        setUser(null);
        setLoading(false);
      });

    return () => {
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