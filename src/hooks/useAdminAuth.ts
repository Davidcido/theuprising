import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackLogin } from "@/lib/trackLogin";
import type { User } from "@supabase/supabase-js";

const AUTH_TIMEOUT = 3000;

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const resolve = (u: User | null, admin: boolean, err: string | null) => {
      if (!mounted.current) return;
      setUser(u);
      setIsAdmin(admin);
      setError(err);
      setLoading(false);
    };

    const checkRole = async (userId: string): Promise<boolean> => {
      try {
        const { data, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin");

        if (roleError) {
          console.error("Role check error:", roleError);
          return false;
        }
        return !!(data && data.length > 0);
      } catch (err) {
        console.error("Role check exception:", err);
        return false;
      }
    };

    const init = async () => {
      // Safety timeout — always clears loading
      timeoutId = setTimeout(() => {
        resolve(null, false, "Admin verification timed out. Please refresh.");
      }, AUTH_TIMEOUT);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted.current) return;

        if (sessionError || !session?.user) {
          resolve(null, false, sessionError ? sessionError.message : null);
          clearTimeout(timeoutId);
          return;
        }

        const admin = await checkRole(session.user.id);

        if (!mounted.current) return;

        clearTimeout(timeoutId);
        resolve(session.user, admin, admin ? null : "Your account does not have admin privileges.");
      } catch (err: any) {
        clearTimeout(timeoutId);
        resolve(null, false, err?.message || "Failed to verify admin status");
      }
    };

    init();

    // Keep reacting to future auth changes (login/logout while on page)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Re-check role on sign-in
        if (event === "SIGNED_IN") {
          checkRole(currentUser.id).then((admin) => {
            if (!mounted.current) return;
            setIsAdmin(admin);
            setLoading(false);
          });
        }
      }
    );

    return () => {
      mounted.current = false;
      clearTimeout(timeoutId);
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
