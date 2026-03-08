-- Add engagement_score column for smart feed ranking
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS engagement_score real DEFAULT 0;

-- Create function to recalculate engagement score
CREATE OR REPLACE FUNCTION public.recalculate_engagement_score(post_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p_likes integer;
  p_comments integer;
  p_shares integer;
  p_created_at timestamptz;
  hours_old float;
  recency_boost float;
  score float;
BEGIN
  SELECT likes_count, comments_count, shares_count, created_at
  INTO p_likes, p_comments, p_shares, p_created_at
  FROM public.community_posts WHERE id = post_id_input;

  hours_old := EXTRACT(EPOCH FROM (now() - p_created_at)) / 3600.0;
  
  -- Recency boost: decays over time (max 50 for brand new, ~0 after 48h)
  recency_boost := GREATEST(0, 50.0 * (1.0 - (hours_old / 48.0)));
  
  score := (p_likes * 3.0) + (p_comments * 4.0) + (p_shares * 5.0) + recency_boost;
  
  UPDATE public.community_posts SET engagement_score = score WHERE id = post_id_input;
END;
$$;

-- Create trigger to auto-recalculate score when post engagement changes
CREATE OR REPLACE FUNCTION public.trigger_recalculate_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recalculate_engagement_score(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalc_engagement_score ON public.community_posts;
CREATE TRIGGER recalc_engagement_score
  AFTER UPDATE OF likes_count, comments_count, shares_count ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_score();

-- Recalculate all existing posts
UPDATE public.community_posts SET engagement_score = 
  (likes_count * 3.0) + (comments_count * 4.0) + (shares_count * 5.0) + 
  GREATEST(0, 50.0 * (1.0 - (EXTRACT(EPOCH FROM (now() - created_at)) / 3600.0 / 48.0)));

-- Create index for fast ranking queries
CREATE INDEX IF NOT EXISTS idx_community_posts_engagement ON public.community_posts (engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts (author_id);