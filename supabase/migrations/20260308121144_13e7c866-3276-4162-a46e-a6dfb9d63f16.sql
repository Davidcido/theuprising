-- Add parent_comment_id for threaded replies
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE DEFAULT NULL;

-- Index for efficient thread loading
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.community_comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.community_comments (post_id, created_at);