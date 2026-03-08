
-- Add online_status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS online_status text NOT NULL DEFAULT 'offline';

-- Create trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
