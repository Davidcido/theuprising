CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('publish-feed-queue-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'publish-feed-queue-hourly'
);
SELECT cron.unschedule('plan-feed-content-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'plan-feed-content-daily'
);

SELECT cron.schedule(
  'publish-feed-queue-hourly',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cgkvvfybtaynwvvfcyob.supabase.co/functions/v1/publish-feed-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna3Z2ZnlidGF5bnd2dmZjeW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTgxODcsImV4cCI6MjA4ODM5NDE4N30.Q_fl7V06aZG4rnhcrHgIMTGC88jIY-3Y7uNgOd5DXus"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'plan-feed-content-daily',
  '25 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cgkvvfybtaynwvvfcyob.supabase.co/functions/v1/plan-feed-content',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna3Z2ZnlidGF5bnd2dmZjeW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTgxODcsImV4cCI6MjA4ODM5NDE4N30.Q_fl7V06aZG4rnhcrHgIMTGC88jIY-3Y7uNgOd5DXus"}'::jsonb,
    body := '{"days": 3}'::jsonb
  );
  $$
);