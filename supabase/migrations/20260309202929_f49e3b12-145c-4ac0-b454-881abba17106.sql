ALTER TABLE public.community_likes ADD COLUMN liker_user_id uuid DEFAULT NULL;

CREATE INDEX idx_community_likes_post_id_liker ON public.community_likes (post_id, liker_user_id) WHERE liker_user_id IS NOT NULL;