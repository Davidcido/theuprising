import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

const LOGOUT_FLAG = "uprising_logged_out";

interface AuthState {
  user: User | null;
  session: Session | null;
  isReady: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, session: null, isReady: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, isReady: false });

  useEffect(() => {
    // If the logout flag is set, force logged-out state immediately
    // This prevents preview/PWA from restoring a cached session after logout
    const wasLoggedOut = sessionStorage.getItem(LOGOUT_FLAG) === "1";
    if (wasLoggedOut) {
      sessionStorage.removeItem(LOGOUT_FLAG);
      // Force sign out any lingering session the client may have cached
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setState({ user: null, session: null, isReady: true });
      // Still subscribe so future logins work
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === "SIGNED_IN" && session?.user) {
            setState({ user: session.user, session, isReady: true });
          } else if (event === "SIGNED_OUT") {
            setState({ user: null, session: null, isReady: true });
          }
        }
      );
      return () => subscription.unsubscribe();
    }

    // Normal flow: listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Auth] state change:", event);
        setState({ user: session?.user ?? null, session: session ?? null, isReady: true });
      }
    );

    // Force-refresh session from server
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      const user = (!error && session?.user) ? session.user : null;
      const validSession = user ? session : null;
      setState(prev => prev.isReady ? prev : { user, session: validSession, isReady: true });
    });

    // Safety timeout for Safari edge cases
    const timeout = setTimeout(() => {
      setState(prev => prev.isReady ? prev : { ...prev, isReady: true });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthReady() {
  return useContext(AuthContext);
}

/** Set a flag so AuthProvider knows to force-clear session on next load */
export function markLoggedOut() {
  try { sessionStorage.setItem(LOGOUT_FLAG, "1"); } catch {}
}
