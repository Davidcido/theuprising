import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const FALLBACK_ADMIN_EMAIL = "davidcido39@gmail.com";

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const checkRole = async (userId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (error) return false;
        return data === true;
      } catch { return false; }
    };

    const resolve = async (currentUser: User | null) => {
      if (!mounted.current) return;
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const hasRole = await checkRole(currentUser.id);
      if (!mounted.current) return;
      const allowed = hasRole || (currentUser.email?.toLowerCase() === FALLBACK_ADMIN_EMAIL);
      setIsAdmin(allowed);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => resolve(session?.user ?? null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      resolve(session?.user ?? null);
    });

    return () => { mounted.current = false; subscription.unsubscribe(); };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut({ scope: "global" });
    setUser(null);
    setIsAdmin(false);
    const sid = localStorage.getItem("uprising_session_id");
    localStorage.clear();
    sessionStorage.clear();
    if (sid) localStorage.setItem("uprising_session_id", sid);
    window.location.href = "/";
  };

  return { isAuthenticated: !!user, isAdmin, loading, logout };
};
