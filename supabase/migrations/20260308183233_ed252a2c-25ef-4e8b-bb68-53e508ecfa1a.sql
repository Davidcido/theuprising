
CREATE TABLE public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  onboarding_reason text
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding" ON public.user_onboarding
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
