import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Draft = {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
};

export const useDrafts = (userId?: string) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("post_drafts")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (data) setDrafts(data as Draft[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const saveDraft = async (content: string, mediaUrls: string[] = [], isAnonymous = true) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("post_drafts")
      .insert({ user_id: userId, content, media_urls: mediaUrls, is_anonymous: isAnonymous })
      .select()
      .single();
    if (!error && data) {
      setDrafts(prev => [data as Draft, ...prev]);
      return data;
    }
    return null;
  };

  const updateDraft = async (draftId: string, content: string, mediaUrls?: string[], isAnonymous?: boolean) => {
    if (!userId) return;
    const updates: any = { content, updated_at: new Date().toISOString() };
    if (mediaUrls !== undefined) updates.media_urls = mediaUrls;
    if (isAnonymous !== undefined) updates.is_anonymous = isAnonymous;
    await supabase.from("post_drafts").update(updates).eq("id", draftId).eq("user_id", userId);
    setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, ...updates } : d));
  };

  const deleteDraft = async (draftId: string) => {
    if (!userId) return;
    await supabase.from("post_drafts").delete().eq("id", draftId).eq("user_id", userId);
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  return { drafts, loading, saveDraft, updateDraft, deleteDraft, refetch: fetchDrafts };
};
