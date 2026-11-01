-- Optional: run the lifecycle tick every 10 minutes from inside Postgres (pg_cron + pg_net).
-- 1. Enable pg_cron and pg_net in the Supabase dashboard (Database -> Extensions).
-- 2. Store your project URL and the tick secret in Vault, then uncomment the schedule below.
--    select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--    select vault.create_secret('<the CRON_SECRET you set for edge functions>', 'cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Fallback that needs no HTTP at all: pure SQL decay every 10 minutes.
select cron.schedule('chainpepu-tick-sql', '*/10 * * * *', $$ select public.tick_all_creatures(); $$);

-- Full tick (decay + quests + ambient creature conversations) via the edge function:
-- select cron.schedule('chainpepu-tick-edge', '*/15 * * * *', $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/tick',
--     headers := jsonb_build_object('Content-Type', 'application/json',
--                                   'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
--     body := '{}'::jsonb
--   );
-- $$);
