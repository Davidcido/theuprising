
CREATE TABLE public.ai_personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  role TEXT NOT NULL DEFAULT 'companion',
  personality TEXT NOT NULL DEFAULT '',
  conversation_style TEXT DEFAULT '',
  interests TEXT DEFAULT '',
  emotional_tone TEXT DEFAULT 'warm',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read builtin personas" ON public.ai_personas
  FOR SELECT TO public USING (is_builtin = true);

CREATE POLICY "Users can read own personas" ON public.ai_personas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own personas" ON public.ai_personas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_builtin = false);

CREATE POLICY "Users can update own personas" ON public.ai_personas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_builtin = false);

CREATE POLICY "Users can delete own personas" ON public.ai_personas
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_builtin = false);
