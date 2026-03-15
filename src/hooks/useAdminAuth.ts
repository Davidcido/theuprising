import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackLogin } from "@/lib/trackLogin";
import type { User } from "@supabase/supabase-js";

const AUTH_TIMEOUT = 3000;
const FALLBACK_ADMIN_EMAIL = "davidcido39@gmail.com";

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearAuthTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const isFallbackAdmin = (currentUser: User | null) => {
      return (currentUser?.email || "").toLowerCase() === FALLBACK_ADMIN_EMAIL;
    };

    const checkRole = async (userId: string): Promise<boolean> => {
      try {
        const { data, error: roleError } = await supabase
          .rpc("has_role", { _user_id: userId, _role: "admin" });

        if (roleError) {
          console.error("Role check error:", roleError);
          return false;
        }

        return data === true;
      } catch (err) {
        console.error("Role check exception:", err);
        return false;
      }
    };

    const resolveAdminAccess = async (currentUser: User | null) => {
      if (!mounted.current) return;

      clearAuthTimeout();
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      timeoutId = setTimeout(() => {
        if (!mounted.current) return;
        setIsAdmin(false);
        setError("Admin verification timed out. Please refresh.");
        setLoading(false);
      }, AUTH_TIMEOUT);

      try {
        const hasAdminRole = await checkRole(currentUser.id);
        if (!mounted.current) return;

        const allowed = hasAdminRole || isFallbackAdmin(currentUser);
        setIsAdmin(allowed);
        setError(allowed ? null : "Your account does not have admin privileges.");
      } finally {
        if (!mounted.current) return;
        clearAuthTimeout();
        setLoading(false);
      }
    };

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await resolveAdminAccess(session?.user ?? null);
      } catch (err: any) {
        if (!mounted.current) return;
        clearAuthTimeout();
        setUser(null);
        setIsAdmin(false);
        setError(err?.message || "Failed to verify admin status");
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveAdminAccess(session?.user ?? null);
    });

    return () => {
      mounted.current = false;
      clearAuthTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      toast.error("Login failed: " + loginError.message);
      setError(loginError.message);
      return false;
    }
    trackLogin(data.session?.user.id);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut({ scope: "global" });
    setUser(null);
    setIsAdmin(false);
    const sessionIdBackup = localStorage.getItem("uprising_session_id");
    localStorage.clear();
    sessionStorage.clear();
    if (sessionIdBackup) localStorage.setItem("uprising_session_id", sessionIdBackup);
    window.location.href = "/";
  };

  return {
    isAuthenticated: !!user,
    isAdmin,
    loading,
    error,
    login,
    logout,
  };
};
