
ALTER TABLE public.community_posts
ADD COLUMN original_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL DEFAULT NULL;

ALTER TABLE public.community_posts
ADD COLUMN reposted_by_name text DEFAULT NULL;
