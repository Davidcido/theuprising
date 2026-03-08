
-- Community posts table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  anonymous_name TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Community comments table
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  anonymous_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Community likes table (track unique likes)
CREATE TABLE public.community_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, session_id)
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (anonymous community)
CREATE POLICY "Anyone can read posts" ON public.community_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create posts" ON public.community_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update posts" ON public.community_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read comments" ON public.community_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create comments" ON public.community_comments FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read likes" ON public.community_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create likes" ON public.community_likes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete likes" ON public.community_likes FOR DELETE TO anon, authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_likes;

-- Function to increment likes
CREATE OR REPLACE FUNCTION public.increment_likes(post_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = post_id_input;
END;
$$;

-- Function to decrement likes
CREATE OR REPLACE FUNCTION public.decrement_likes(post_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = post_id_input;
END;
$$;

-- Function to increment comments count
CREATE OR REPLACE FUNCTION public.increment_comments(post_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = post_id_input;
END;
$$;
