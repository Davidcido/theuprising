
-- Allow service role to insert memories (edge function uses service role)
-- Add policy for service role insert via RLS bypass (service role already bypasses RLS)
-- But we need anon/authenticated to not insert directly - that's already the case.
-- No additional migration needed since edge function uses service_role_key which bypasses RLS.
SELECT 1;
