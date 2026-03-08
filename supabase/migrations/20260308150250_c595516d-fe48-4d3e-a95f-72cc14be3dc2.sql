
-- Add media columns to community_posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';

-- Add media columns to community_comments
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS media_url text;

-- Create comment_reactions table
CREATE TABLE public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, session_id, emoji)
);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comment reactions" ON public.comment_reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can create comment reactions" ON public.comment_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete comment reactions" ON public.comment_reactions FOR DELETE USING (true);

-- Enable realtime for comment_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;

-- Create storage bucket for community media
INSERT INTO storage.buckets (id, name, public) VALUES ('community-media', 'community-media', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for community-media bucket
CREATE POLICY "Anyone can upload community media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'community-media');
CREATE POLICY "Anyone can read community media" ON storage.objects FOR SELECT USING (bucket_id = 'community-media');
