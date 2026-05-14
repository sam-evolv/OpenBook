-- Recap pipeline — migration 01
-- Hooks the post-visit recap into the existing pg_cron drain by
--   (a) extending the pending_reminders.kind CHECK constraint to
--       allow 'recap_3h'
--   (b) replacing run_drain() with a version that branches Stage D's
--       dispatch by kind so 'recap_3h' rows go to /api/internal/send-recap
--       while 'reminder_24h' / 'reminder_2h' continue to go to
--       /api/internal/send-reminder.
--
-- Quiet hours (21:00–07:59 Europe/Dublin) still gate Stage D as a
-- whole — the recap branch sits inside the same `IF NOT v_in_quiet_hours`
-- block as the reminder branch, so recaps inherit quiet hours for free.
--
-- Stage A (flash-sale matching), Stage B (flash-sale delivery), and
-- Stage C (reminder enqueue) are unchanged. Recap rows are enqueued
-- by the Next.js booking-create paths (app/api/booking/route.ts and
-- app/api/open-spots/[saleId]/claim/route.ts) — the drain only routes
-- them. No Stage C polling fallback for recap_3h on purpose: bookings
-- created before this migration ran won't get a recap, which is the
-- intended graceful rollout.

ALTER TABLE public.pending_reminders
  DROP CONSTRAINT IF EXISTS pending_reminders_kind_check;

ALTER TABLE public.pending_reminders
  ADD CONSTRAINT pending_reminders_kind_check
  CHECK (kind IN ('reminder_24h', 'reminder_2h', 'recap_3h'));

CREATE OR REPLACE FUNCTION public.run_drain()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_dublin_hour int;
  v_in_quiet_hours boolean;
  v_app_url text;
  v_cron_secret text;
  v_auth_header text;
  v_new_sale record;
  v_match record;
  v_fsn record;
  v_reminder record;
  v_dispatch_path text;
  v_stage_a_matched int := 0;
  v_stage_b_dispatched int := 0;
  v_stage_b_skipped int := 0;
  v_stage_c_enqueued int := 0;
  v_stage_d_dispatched int := 0;
BEGIN
  v_dublin_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'Europe/Dublin')::int;
  v_in_quiet_hours := v_dublin_hour >= 21 OR v_dublin_hour < 8;

  BEGIN
    v_app_url := current_setting('app.public_url');
  EXCEPTION WHEN undefined_object THEN
    v_app_url := 'https://app.openbook.ie';
  END;

  SELECT decrypted_secret INTO v_cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  v_auth_header := 'Bearer ' || COALESCE(v_cron_secret, '');

  ------------------------------------------------------------------
  -- Stage A — standing-alert matching
  ------------------------------------------------------------------
  FOR v_new_sale IN
    SELECT fs.id
    FROM flash_sales fs
    WHERE fs.created_at > now() - interval '24 hours'
      AND fs.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM flash_sale_notifications fsn WHERE fsn.sale_id = fs.id
      )
  LOOP
    FOR v_match IN
      SELECT m.customer_id
      FROM match_standing_slots_to_sale(v_new_sale.id) m
    LOOP
      INSERT INTO flash_sale_notifications (sale_id, customer_id, status)
      VALUES (v_new_sale.id, v_match.customer_id, 'queued')
      ON CONFLICT (sale_id, customer_id) DO NOTHING;

      IF FOUND THEN
        v_stage_a_matched := v_stage_a_matched + 1;
      END IF;
    END LOOP;
  END LOOP;

  ------------------------------------------------------------------
  -- Stage B — standing-alert delivery (gated by quiet hours)
  ------------------------------------------------------------------
  IF NOT v_in_quiet_hours THEN
    FOR v_fsn IN
      SELECT fsn.id, fsn.customer_id, fsn.sale_id
      FROM flash_sale_notifications fsn
      WHERE fsn.status = 'queued'
      ORDER BY fsn.created_at ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    LOOP
      IF EXISTS (
        SELECT 1
        FROM push_log pl
        JOIN flash_sales fs_seen ON fs_seen.id = pl.sale_id
        JOIN flash_sales fs_now  ON fs_now.id  = v_fsn.sale_id
        WHERE pl.customer_id = v_fsn.customer_id
          AND fs_seen.business_id = fs_now.business_id
          AND pl.delivered = true
          AND pl.sent_at > now() - interval '24 hours'
      ) THEN
        UPDATE flash_sale_notifications
        SET status = 'skipped', block_reason = 'rate_limited'
        WHERE id = v_fsn.id;
        v_stage_b_skipped := v_stage_b_skipped + 1;
        CONTINUE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM flash_sales fs
        WHERE fs.id = v_fsn.sale_id
          AND fs.status = 'active'
          AND COALESCE(fs.bookings_taken, 0) < COALESCE(fs.max_bookings, 1)
          AND fs.expires_at > now()
      ) THEN
        UPDATE flash_sale_notifications
        SET status = 'skipped', block_reason = 'sale_dead'
        WHERE id = v_fsn.id;
        v_stage_b_skipped := v_stage_b_skipped + 1;
        CONTINUE;
      END IF;

      UPDATE flash_sale_notifications
      SET status = 'dispatching'
      WHERE id = v_fsn.id;

      PERFORM net.http_post(
        url := v_app_url || '/api/internal/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', v_auth_header
        ),
        body := jsonb_build_object('notification_id', v_fsn.id)
      );

      v_stage_b_dispatched := v_stage_b_dispatched + 1;
    END LOOP;
  END IF;

  ------------------------------------------------------------------
  -- Stage C — booking-reminder matching
  ------------------------------------------------------------------
  -- 24h-reminder
  INSERT INTO pending_reminders (booking_id, kind, scheduled_for)
  SELECT b.id, 'reminder_24h', b.starts_at - interval '24 hours'
  FROM bookings b
  WHERE b.status = 'confirmed'
    AND b.customer_id IS NOT NULL
    AND COALESCE(b.reminder_24h_sent, false) = false
    AND b.starts_at > now() - interval '15 minutes'
    AND b.starts_at - interval '24 hours' BETWEEN now() - interval '15 minutes' AND now() + interval '24 hours'
  ON CONFLICT (booking_id, kind) DO NOTHING;

  GET DIAGNOSTICS v_stage_c_enqueued = ROW_COUNT;

  -- 2h-reminder
  INSERT INTO pending_reminders (booking_id, kind, scheduled_for)
  SELECT b.id, 'reminder_2h', b.starts_at - interval '2 hours'
  FROM bookings b
  WHERE b.status = 'confirmed'
    AND b.customer_id IS NOT NULL
    AND COALESCE(b.reminder_2h_sent, false) = false
    AND b.starts_at > now() - interval '15 minutes'
    AND b.starts_at - interval '2 hours' BETWEEN now() - interval '15 minutes' AND now() + interval '2 hours'
  ON CONFLICT (booking_id, kind) DO NOTHING;

  ------------------------------------------------------------------
  -- Stage D — pending-reminder delivery (gated by quiet hours)
  ------------------------------------------------------------------
  IF NOT v_in_quiet_hours THEN
    FOR v_reminder IN
      SELECT pr.id, pr.booking_id, pr.kind
      FROM pending_reminders pr
      WHERE pr.status = 'queued'
        AND pr.scheduled_for <= now() + interval '5 minutes'
      ORDER BY pr.scheduled_for ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    LOOP
      UPDATE pending_reminders
      SET status = 'dispatching', attempt_count = attempt_count + 1
      WHERE id = v_reminder.id;

      -- Route by kind. Recap pushes go to a dedicated endpoint so the
      -- payload shape can diverge from booking-reminder pushes; the
      -- existing reminder kinds (reminder_24h, reminder_2h) continue
      -- to hit /api/internal/send-reminder so this migration is safely
      -- forward-compatible with rows already in the queue.
      IF v_reminder.kind = 'recap_3h' THEN
        v_dispatch_path := '/api/internal/send-recap';
      ELSE
        v_dispatch_path := '/api/internal/send-reminder';
      END IF;

      PERFORM net.http_post(
        url := v_app_url || v_dispatch_path,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', v_auth_header
        ),
        body := jsonb_build_object('reminder_id', v_reminder.id)
      );

      v_stage_d_dispatched := v_stage_d_dispatched + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'dublin_hour', v_dublin_hour,
    'quiet_hours', v_in_quiet_hours,
    'stage_a_matched', v_stage_a_matched,
    'stage_b_dispatched', v_stage_b_dispatched,
    'stage_b_skipped', v_stage_b_skipped,
    'stage_c_enqueued', v_stage_c_enqueued,
    'stage_d_dispatched', v_stage_d_dispatched
  );
END;
$func$;
