
-- Add missing indexes for feed and comment performance
-- (IF NOT EXISTS prevents errors if they already exist from previous migrations)

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at_desc ON public.community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON public.community_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent_id ON public.community_comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_created_at ON public.community_comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON public.community_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_post_id ON public.community_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions (comment_id);
