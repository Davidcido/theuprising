import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isReady: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, session: null, isReady: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, isReady: false });

  useEffect(() => {
    // 1. Listen FIRST so we catch INITIAL_SESSION + SIGNED_OUT events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Auth] state change:", event);
        setState({ user: session?.user ?? null, session, isReady: true });
      }
    );

    // 2. Force-refresh session from server (not just local cache) for PWA reliability
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => prev.isReady ? prev : { user: session?.user ?? null, session, isReady: true });
    });

    // 3. Safety timeout for Safari edge cases
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
