-- Push Platform — migration 01
-- Native push notification device tokens (FCM-issued for iOS/Android, future Web Push).
-- Tokens are scoped to a customer; auto-deactivated when FCM reports them invalid.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

CREATE TABLE push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, token)
);

CREATE INDEX push_device_tokens_customer_active_idx
  ON push_device_tokens (customer_id, is_active)
  WHERE is_active = true;

CREATE INDEX push_device_tokens_token_idx ON push_device_tokens (token);

ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policy: writes happen via service role only,
-- through /api/notifications/register-device which uses supabaseAdmin().

CREATE OR REPLACE FUNCTION push_device_tokens_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_device_tokens_updated_at
  BEFORE UPDATE ON push_device_tokens
  FOR EACH ROW EXECUTE FUNCTION push_device_tokens_set_updated_at();
