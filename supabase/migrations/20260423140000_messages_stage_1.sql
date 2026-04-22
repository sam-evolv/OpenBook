-- Phase 4 PR 4.2 Messages (Stage 1): schema for the unified inbox.

-- 1. ai_queries — MCP-sourced interactions.
-- The MCP server at mcp.openbook.ie writes rows here when an external
-- AI assistant (ChatGPT / Claude / Gemini) queries a business via MCP.
-- The dashboard reads them in the inbox alongside WhatsApp threads.
-- 'source' is loose text so the enum can evolve without another migration.
-- Known values: 'chatgpt' | 'claude' | 'gemini'.
CREATE TABLE IF NOT EXISTS ai_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL,
  query text NOT NULL,
  region text,
  resulted_in_booking_id uuid REFERENCES bookings(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_queries_business_created_idx
  ON ai_queries (business_id, created_at DESC);

-- RLS: owner can read their own business's queries.
ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_queries_owner_select
  ON ai_queries FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- 2. Unread tracking on WhatsApp conversations.
-- Messages page compares whatsapp_conversations.last_message_at to this
-- column to compute unread counts.
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

-- 3. Provenance on outbound WhatsApp messages.
-- 'bot' = auto-reply from the webhook brain;
-- 'manual' = dashboard-initiated send;
-- 'automation' = reminder / flash-sale push (future).
-- Nullable — old rows have no provenance and render without the "Auto" pill.
-- The webhook code update to stamp 'bot' on outbound inserts rides in the
-- Messages PR alongside the UI.
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS source text;
