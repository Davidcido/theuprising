import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AIMemory = {
  id: string;
  memory_text: string;
  category: string;
  importance_score?: number;
  memory_type?: string;
  created_at: string;
};

export type LifeEvent = {
  id: string;
  event_text: string;
  event_category: string;
  event_date?: string | null;
  importance_score?: number | null;
  created_at: string;
};

export function useAIMemory() {
  const [userId, setUserId] = useState<string | null>(null);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean | null>(null);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [realName, setRealName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch preference and real name
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [prefResult, profileResult] = await Promise.all([
          supabase
            .from("ai_memory_preferences" as any)
            .select("memory_enabled")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("real_name" as any)
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        if (prefResult.error) {
          console.error("[AIMemory] Preference fetch error:", prefResult.error);
          setMemoryEnabled(null);
        } else if (prefResult.data) {
          setMemoryEnabled((prefResult.data as any).memory_enabled);
        } else {
          setMemoryEnabled(null);
        }

        if (profileResult.data) {
          setRealName((profileResult.data as any).real_name || null);
        }
      } catch (e) {
        console.error("[AIMemory] Fetch exception:", e);
        if (!cancelled) setMemoryEnabled(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const timer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [userId]);

  // Fetch memories and life events when enabled
  useEffect(() => {
    if (!userId || memoryEnabled !== true) { setMemories([]); setLifeEvents([]); return; }
    let cancelled = false;
    Promise.all([
      supabase
        .from("ai_memories" as any)
        .select("*")
        .eq("user_id", userId)
        .order("importance_score", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("life_events" as any)
        .select("*")
        .eq("user_id", userId)
        .order("importance_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
    ]).then(([memResult, evtResult]) => {
      if (cancelled) return;
      if (memResult.error) console.error("[AIMemory] Memories fetch error:", memResult.error);
      if (memResult.data) setMemories(memResult.data as any);
      if (evtResult.error) console.error("[AIMemory] Life events fetch error:", evtResult.error);
      if (evtResult.data) setLifeEvents(evtResult.data as any);
    });
    return () => { cancelled = true; };
  }, [userId, memoryEnabled]);

  const setPreference = useCallback(async (enabled: boolean) => {
    if (!userId) return null;
    try {
      const { error } = await supabase
        .from("ai_memory_preferences" as any)
        .upsert({ user_id: userId, memory_enabled: enabled, updated_at: new Date().toISOString() } as any, { onConflict: "user_id" });
      setMemoryEnabled(enabled);
      if (error) console.error("[AIMemory] setPreference error:", error);
      return error;
    } catch (e) {
      console.error("[AIMemory] setPreference exception:", e);
      setMemoryEnabled(enabled);
      return e;
    }
  }, [userId]);

  const clearMemories = useCallback(async () => {
    if (!userId) return;
    try {
      await Promise.all([
        supabase.from("ai_memories" as any).delete().eq("user_id", userId),
        supabase.from("life_events" as any).delete().eq("user_id", userId),
      ]);
    } catch (e) {
      console.error("[AIMemory] clearMemories error:", e);
    }
    setMemories([]);
    setLifeEvents([]);
  }, [userId]);

  const deleteMemory = useCallback(async (memoryId: string) => {
    try {
      await supabase.from("ai_memories" as any).delete().eq("id", memoryId);
    } catch (e) {
      console.error("[AIMemory] deleteMemory error:", e);
    }
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }, []);

  const disableAndClear = useCallback(async () => {
    await setPreference(false);
    await clearMemories();
  }, [setPreference, clearMemories]);

  const refetchMemories = useCallback(async () => {
    if (!userId) return;
    try {
      const [memResult, profileResult, evtResult] = await Promise.all([
        supabase
          .from("ai_memories" as any)
          .select("*")
          .eq("user_id", userId)
          .order("importance_score", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("real_name" as any)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("life_events" as any)
          .select("*")
          .eq("user_id", userId)
          .order("importance_score", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (memResult.data) setMemories(memResult.data as any);
      if (profileResult.data) setRealName((profileResult.data as any).real_name || null);
      if (evtResult.data) setLifeEvents(evtResult.data as any);
    } catch (e) {
      console.error("[AIMemory] refetchMemories error:", e);
    }
  }, [userId]);

  return {
    userId,
    memoryEnabled,
    memories,
    lifeEvents,
    realName,
    loading,
    setPreference,
    clearMemories,
    deleteMemory,
    disableAndClear,
    refetchMemories,
  };
}
