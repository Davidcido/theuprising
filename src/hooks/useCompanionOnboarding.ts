import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCompanionOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<{
    preferred_name?: string;
    life_goal?: string;
    current_feeling?: string;
    companion_purposes?: string[];
    interaction_style?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("companion_preferences" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data || !(data as any).onboarding_completed) {
        setShowOnboarding(true);
      } else {
        setPreferences(data as any);
      }
      setLoading(false);
    };

    check();
    return () => { cancelled = true; };
  }, []);

  const complete = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, loading, preferences, complete };
}
