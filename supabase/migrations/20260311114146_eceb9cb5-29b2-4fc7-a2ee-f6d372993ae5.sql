
CREATE TABLE public.life_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_text TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'general',
  event_date TEXT,
  importance_score INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own life events"
  ON public.life_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own life events"
  ON public.life_events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
