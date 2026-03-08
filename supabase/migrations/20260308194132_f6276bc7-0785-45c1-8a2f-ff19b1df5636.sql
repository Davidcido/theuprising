
CREATE TABLE public.daily_rise_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_date date NOT NULL UNIQUE,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_rise_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily rise content"
  ON public.daily_rise_content
  FOR SELECT
  USING (true);
