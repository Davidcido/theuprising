-- 1) Hide real_name from public reads (column-level privileges)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, display_name, bio, country, avatar_url, created_at, updated_at, online_status, cover_photo, last_seen_at, pinned_post_id) ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_real_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT real_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_real_name() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_real_name() TO authenticated;

-- 2) profile_views: no public row reads; counts via secure function
DROP POLICY IF EXISTS "Anyone can read view counts" ON public.profile_views;

CREATE OR REPLACE FUNCTION public.get_profile_view_counts(_profile_user_id uuid)
RETURNS TABLE(total_views bigint, weekly_views bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::bigint,
    count(*) FILTER (WHERE viewed_at >= now() - interval '7 days')::bigint
  FROM public.profile_views
  WHERE profile_user_id = _profile_user_id
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_view_counts(uuid) TO anon, authenticated;

-- 3) avatars bucket: enforce per-user folder ownership
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);