
-- Community settings table for master toggle
CREATE TABLE public.community_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read community settings"
  ON public.community_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update community settings"
  ON public.community_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert
CREATE POLICY "Admins can insert community settings"
  ON public.community_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default community status
INSERT INTO public.community_settings (key, value) VALUES ('community_status', 'open');

-- Enable realtime for community_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_settings;
