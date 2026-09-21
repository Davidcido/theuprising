CREATE TABLE IF NOT EXISTS public.feed_media_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_hash text NOT NULL UNIQUE,
  url text NOT NULL,
  kind text NOT NULL DEFAULT 'image',
  visual_concept text,
  post_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.feed_media_assets TO service_role;
ALTER TABLE public.feed_media_assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS feed_media_assets_url_idx ON public.feed_media_assets (url);

INSERT INTO public.feed_media_assets (asset_hash, url, kind, post_id, created_at)
SELECT DISTINCT ON (m.url) md5(m.url), m.url,
  CASE WHEN m.url ILIKE '%.mp4' THEN 'video' ELSE 'image' END,
  p.id, p.created_at
FROM public.community_posts p, unnest(p.media_urls) AS m(url)
WHERE m.url IS NOT NULL
ON CONFLICT (asset_hash) DO NOTHING;