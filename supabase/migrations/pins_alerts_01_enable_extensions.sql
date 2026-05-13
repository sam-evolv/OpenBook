-- Standing alerts + reminders — migration 01
-- Enables pg_cron (drives the per-minute drain) and pg_net (lets the drain
-- call back into the Vercel app over HTTPS).
--
-- Prerequisite: pg_cron must already be in shared_preload_libraries on the
-- Postgres cluster, which on Supabase is toggled via the dashboard
-- (Database → Extensions). If apply_migration here errors with
-- "pg_cron is not allowed", enable from the dashboard first, then re-run.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- The drain runs as the `postgres` role under cron; this grant lets it
-- schedule its own jobs in idempotent re-runs.
GRANT USAGE ON SCHEMA cron TO postgres;
