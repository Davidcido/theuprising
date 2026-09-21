
-- 1. Ownership on engagement deletions (user deletions go through SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "Anyone can delete likes" ON public.community_likes;
CREATE POLICY "Admins can delete likes" ON public.community_likes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR (liker_user_id IS NOT NULL AND liker_user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can delete reactions" ON public.community_reactions;
CREATE POLICY "Admins can delete reactions" ON public.community_reactions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can delete comment reactions" ON public.comment_reactions;
CREATE POLICY "Admins can delete comment reactions" ON public.comment_reactions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Prevent author impersonation on posts and comments
DROP POLICY IF EXISTS "Anyone can create posts" ON public.community_posts;
CREATE POLICY "Anyone can create posts" ON public.community_posts FOR INSERT TO anon, authenticated
WITH CHECK (author_id IS NULL OR author_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can create comments" ON public.community_comments;
CREATE POLICY "Anyone can create comments" ON public.community_comments FOR INSERT TO anon, authenticated
WITH CHECK (author_id IS NULL OR author_id = auth.uid());

-- 3. Analytics rows cannot be forged against another account
DROP POLICY IF EXISTS "Anyone can insert login sessions" ON public.login_sessions;
CREATE POLICY "Own login sessions only" ON public.login_sessions FOR INSERT TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert signups" ON public.signups;
CREATE POLICY "Own signups only" ON public.signups FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
CREATE POLICY "Own profile views only" ON public.profile_views FOR INSERT TO anon, authenticated
WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

-- 4. Function execution: remove blanket PUBLIC execute, grant only where required
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_real_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_conversation_between(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_view_counts(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_likes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_likes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_comments(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shares(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_liked_posts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_reactions(uuid[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_comment_reactions(uuid[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_like(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_reaction(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_comment_reaction(uuid, text, text) TO anon, authenticated;
