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

        if (error) {
          console.error("[admin] role lookup failed", error);
          return false;
        }

        return data === true;
      } catch (error) {
        console.error("[admin] role lookup exception", error);
        return false;
      }
    };

    const resolveAdminAccess = async (currentUser: User | null) => {
      if (!mounted.current) return;

      setLoading(true);
      setUser(currentUser);

      if (!currentUser) {
        console.log("[admin] no authenticated user");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const hasAdminRole = await checkRole(currentUser.id);
      if (!mounted.current) return;

      const normalizedEmail = currentUser.email?.toLowerCase() ?? "";
      const allowedByEmail = normalizedEmail === FALLBACK_ADMIN_EMAIL;
      const allowed = hasAdminRole || allowedByEmail;

      console.log("[admin] access check", {
        email: currentUser.email,
        userId: currentUser.id,
        hasAdminRole,
        allowedByEmail,
        allowed,
      });

      setIsAdmin(allowed);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveAdminAccess(session?.user ?? null);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void resolveAdminAccess(session?.user ?? null);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
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

  return {
    user,
    isAuthenticated: !!user,
    isAdmin,
    loading,
    logout,
  };
};

