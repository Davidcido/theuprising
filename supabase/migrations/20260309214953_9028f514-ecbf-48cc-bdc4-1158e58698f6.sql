INSERT INTO public.profiles (user_id, display_name)
SELECT u.id, split_part(u.email, '@', 1)
FROM auth.users u
WHERE u.id NOT IN (SELECT p.user_id FROM public.profiles p);