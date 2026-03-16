import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const FALLBACK_ADMIN_EMAIL = "davidcido39@gmail.com";
const VERIFICATION_TIMEOUT = 1500;

type RoleCheckResult = {
  hasAdminRole: boolean;
  roleValue: "admin" | null | "timeout";
  timedOut: boolean;
};

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const verificationRequestId = useRef(0);

  useEffect(() => {
    mounted.current = true;

    const checkRoleWithTimeout = async (userId: string): Promise<RoleCheckResult> => {
      let timeoutId: number | undefined;

      const roleCheckPromise = (async (): Promise<RoleCheckResult> => {
        try {
          const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

          if (error) {
            console.error("[admin] role lookup failed", error);
            return {
              hasAdminRole: false,
              roleValue: null,
              timedOut: false,
            };
          }

          const resolvedRole = data === true ? "admin" : null;

          return {
            hasAdminRole: data === true,
            roleValue: resolvedRole,
            timedOut: false,
          };
        } catch (error) {
          console.error("[admin] role lookup exception", error);
          return {
            hasAdminRole: false,
            roleValue: null,
            timedOut: false,
          };
        }
      })();

      const timeoutPromise = new Promise<RoleCheckResult>((resolve) => {
        timeoutId = window.setTimeout(() => {
          console.warn("[admin] role lookup timed out");
          resolve({
            hasAdminRole: false,
            roleValue: "timeout",
            timedOut: true,
          });
        }, VERIFICATION_TIMEOUT);
      });

      const result = await Promise.race([roleCheckPromise, timeoutPromise]);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      return result;
    };

    const resolveAdminAccess = async (currentUser: User | null) => {
      const requestId = ++verificationRequestId.current;

      if (!mounted.current) return;

      setLoading(true);
      setUser(currentUser);

      if (!currentUser) {
        console.log("[admin] no authenticated user");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const normalizedEmail = currentUser.email?.toLowerCase() ?? "";
      const allowedByEmail = normalizedEmail === FALLBACK_ADMIN_EMAIL;

      console.log("[admin] user email", normalizedEmail);

      try {
        const { hasAdminRole, roleValue, timedOut } = await checkRoleWithTimeout(currentUser.id);

        if (!mounted.current || requestId !== verificationRequestId.current) return;

        const shouldUseFallback = timedOut || roleValue === null;
        const allowed = hasAdminRole || (shouldUseFallback && allowedByEmail);

        if (shouldUseFallback) {
          console.log("[admin] timeout fallback trigger", {
            timedOut,
            roleValue,
            allowedByEmail,
          });
        }

        console.log("[admin] admin role result", {
          role: roleValue,
          hasAdminRole,
          allowed,
        });

        setIsAdmin(allowed);
      } catch (error) {
        console.error("[admin] verification failed", error);
        if (!mounted.current || requestId !== verificationRequestId.current) return;
        setIsAdmin(allowedByEmail);
      } finally {
        if (!mounted.current || requestId !== verificationRequestId.current) return;
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveAdminAccess(session?.user ?? null);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        void resolveAdminAccess(session?.user ?? null);
      })
      .catch((error) => {
        console.error("[admin] session lookup failed", error);
        if (!mounted.current) return;
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
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