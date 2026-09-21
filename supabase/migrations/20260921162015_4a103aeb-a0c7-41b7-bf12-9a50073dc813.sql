-- 1. Community posts: only authors (or admins) may edit
DROP POLICY IF EXISTS "Anyone can update posts" ON public.community_posts;

CREATE POLICY "Authors can update their posts"
ON public.community_posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can update posts"
ON public.community_posts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.increment_shares(post_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.community_posts SET shares_count = shares_count + 1 WHERE id = post_id_input;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_shares(uuid) TO anon, authenticated;

-- 2. Conversation participants: members only
DROP POLICY IF EXISTS "Anyone can read participants" ON public.conversation_participants;

CREATE POLICY "Members can read their conversation participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
  )
);

-- 3. Direct-message attachments: conversation members only
DROP POLICY IF EXISTS "Authenticated users can read dm media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dm media" ON storage.objects;

CREATE POLICY "Conversation members can read dm media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dm-media'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
  )
);

CREATE POLICY "Conversation members can upload dm media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dm-media'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
  )
);