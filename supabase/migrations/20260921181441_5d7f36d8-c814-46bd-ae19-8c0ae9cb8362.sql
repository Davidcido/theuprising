
-- 1. BAN RECORDS: admin only
DROP POLICY IF EXISTS "Anyone can check bans" ON public.banned_users;
REVOKE SELECT ON public.banned_users FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_users TO authenticated;
GRANT ALL ON public.banned_users TO service_role;

-- 2. ANONYMOUS SESSION IDENTIFIERS: hide session_id from public reads
REVOKE SELECT ON public.community_likes FROM anon, authenticated;
GRANT SELECT (id, post_id, created_at, liker_user_id) ON public.community_likes TO anon, authenticated;
REVOKE SELECT ON public.community_reactions FROM anon, authenticated;
GRANT SELECT (id, post_id, emoji, created_at) ON public.community_reactions TO anon, authenticated;
REVOKE SELECT ON public.comment_reactions FROM anon, authenticated;
GRANT SELECT (id, comment_id, emoji, created_at) ON public.comment_reactions TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_liked_posts(_session_id text)
RETURNS TABLE(post_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.post_id FROM public.community_likes l WHERE l.session_id = _session_id
$$;

CREATE OR REPLACE FUNCTION public.get_post_reactions(_post_ids uuid[], _session_id text)
RETURNS TABLE(id uuid, post_id uuid, emoji text, created_at timestamptz, session_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.post_id, r.emoji, r.created_at,
         CASE WHEN r.session_id = _session_id THEN _session_id ELSE '' END
  FROM public.community_reactions r WHERE r.post_id = ANY(_post_ids)
$$;

CREATE OR REPLACE FUNCTION public.get_comment_reactions(_comment_ids uuid[], _session_id text)
RETURNS TABLE(id uuid, comment_id uuid, emoji text, created_at timestamptz, session_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.comment_id, r.emoji, r.created_at,
         CASE WHEN r.session_id = _session_id THEN _session_id ELSE '' END
  FROM public.comment_reactions r WHERE r.comment_id = ANY(_comment_ids)
$$;

CREATE OR REPLACE FUNCTION public.delete_my_like(_post_id uuid, _session_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.community_likes WHERE post_id = _post_id AND session_id = _session_id
$$;

CREATE OR REPLACE FUNCTION public.delete_my_reaction(_post_id uuid, _emoji text, _session_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.community_reactions WHERE post_id = _post_id AND emoji = _emoji AND session_id = _session_id
$$;

CREATE OR REPLACE FUNCTION public.delete_my_comment_reaction(_comment_id uuid, _emoji text, _session_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.comment_reactions WHERE comment_id = _comment_id AND emoji = _emoji AND session_id = _session_id
$$;

REVOKE ALL ON FUNCTION public.get_my_liked_posts(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_post_reactions(uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_comment_reactions(uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_like(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_reaction(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_comment_reaction(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_liked_posts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_reactions(uuid[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_comment_reactions(uuid[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_like(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_reaction(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_comment_reaction(uuid, text, text) TO anon, authenticated;

-- 3. COMMUNITY MEDIA STORAGE
DROP POLICY IF EXISTS "Anyone can upload community media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community media" ON storage.objects;
CREATE POLICY "Authenticated users can upload community media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-media');
DROP POLICY IF EXISTS "Owners can update their community media" ON storage.objects;
CREATE POLICY "Owners can update their community media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'community-media' AND owner = auth.uid())
WITH CHECK (bucket_id = 'community-media' AND owner = auth.uid());
DROP POLICY IF EXISTS "Owners can delete their community media" ON storage.objects;
CREATE POLICY "Owners can delete their community media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-media' AND owner = auth.uid());

-- 4. PRIVILEGED FUNCTIONS: internal only
REVOKE ALL ON FUNCTION public.acquire_feed_job_lease(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_engagement_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_recalculate_score() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_feed_job_lease(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_engagement_score(uuid) TO service_role;
