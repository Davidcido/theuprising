
-- Create companion_preferences table for storing onboarding choices
CREATE TABLE public.companion_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  preferred_name text,
  life_goal text,
  current_feeling text,
  companion_purposes text[] DEFAULT '{}',
  interaction_style text DEFAULT 'balanced',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companion_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own companion preferences"
  ON public.companion_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companion preferences"
  ON public.companion_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companion preferences"
  ON public.companion_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
