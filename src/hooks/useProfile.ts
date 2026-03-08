import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string;
  country: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "bio" | "country" | "avatar_url">>) => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
    }
    return { error };
  };

  const uploadAvatar = async (file: File) => {
    if (!userId) return { url: null, error: "Not authenticated" };
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return { url: null, error: error.message };
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await updateProfile({ avatar_url: url });
    return { url, error: null };
  };

  return { profile, loading, updateProfile, uploadAvatar, refetch: fetchProfile };
};
