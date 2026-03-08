
-- Visitors table
CREATE TABLE public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  visit_time timestamp with time zone NOT NULL DEFAULT now(),
  device_type text,
  country text
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitors"
  ON public.visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read visitors"
  ON public.visitors FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Signups table
CREATE TABLE public.signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signup_time timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert signups"
  ON public.signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read signups"
  ON public.signups FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signups;
