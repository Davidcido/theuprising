
-- Profile views tracking
CREATE TABLE public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL,
  viewer_id uuid,
  viewer_session_id text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profile views" ON public.profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Profile owners can read their views" ON public.profile_views FOR SELECT USING (auth.uid() = profile_user_id);
CREATE POLICY "Anyone can read view counts" ON public.profile_views FOR SELECT USING (true);

-- Bookmarks
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Post drafts
CREATE TABLE public.post_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  media_urls text[] DEFAULT '{}'::text[],
  is_anonymous boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own drafts" ON public.post_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create drafts" ON public.post_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON public.post_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON public.post_drafts FOR DELETE USING (auth.uid() = user_id);

-- Add pinned_post_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pinned_post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- Enable realtime for bookmarks
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;
