
-- Create community_reposts table for repost/quote-repost system
CREATE TABLE public.community_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  quote_content text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reposts_user ON public.community_reposts (user_id);
CREATE INDEX idx_reposts_post ON public.community_reposts (original_post_id);

-- Enable RLS
ALTER TABLE public.community_reposts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read reposts" ON public.community_reposts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reposts" ON public.community_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reposts" ON public.community_reposts FOR DELETE USING (auth.uid() = user_id);

-- Add views_count to community_posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- Enable realtime for reposts
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reposts;
