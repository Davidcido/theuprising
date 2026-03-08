
CREATE OR REPLACE FUNCTION public.increment_views(post_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.community_posts SET views_count = views_count + 1 WHERE id = post_id_input;
END;
$$;
