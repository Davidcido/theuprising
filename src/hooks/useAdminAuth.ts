import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackLogin } from "@/lib/trackLogin";
import type { User } from "@supabase/supabase-js";

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const checkRole = async (userId: string) => {
      try {
        const { data, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin");

        if (!mounted.current) return;

        if (roleError) {
          console.error("Role check error:", roleError);
          setError("Failed to verify admin status");
          setIsAdmin(false);
        } else {
          setIsAdmin(!!(data && data.length > 0));
          setError(null);
        }
      } catch (err) {
        if (!mounted.current) return;
        console.error("Role check exception:", err);
        setError("Failed to verify admin status");
        setIsAdmin(false);
      }
    };

    // Set up listener FIRST (no awaits inside the callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Defer role check to avoid deadlock
          setTimeout(() => checkRole(currentUser.id), 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // Then restore session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        checkRole(currentUser.id).then(() => {
          if (mounted.current) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
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
    await supabase.auth.signOut({ scope: 'global' });
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
