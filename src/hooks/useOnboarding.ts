import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setChecked(true);
        return;
      }

      const { data } = await supabase
        .from("user_onboarding")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!data) {
        setShowOnboarding(true);
      }
      setChecked(true);
    };

    checkOnboarding();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data } = await supabase
          .from("user_onboarding")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!data) {
          setShowOnboarding(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const completeOnboarding = () => setShowOnboarding(false);

  return { showOnboarding, checked, completeOnboarding };
};
