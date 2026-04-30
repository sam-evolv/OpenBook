/**
 * localStorage helpers for the AI tab. Persists the latest active
 * conversation so a refresh, an auth-gate round-trip, or a quick tab
 * switch doesn't drop the user back to a blank chat.
 *
 * Keying:
 *   ob_ai_active         → conversation_id of the most recent chat
 *   ob_ai_session        → anonymous session id (stable across visits)
 *   ob_ai_conversation_<id> → { messages, conversation_id, updated_at }
 */

import type { Message } from './types';

const ACTIVE_KEY = 'ob_ai_active';
const SESSION_KEY = 'ob_ai_session';
const CONV_PREFIX = 'ob_ai_conversation_';
const MAX_MESSAGES = 30;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SavedConversation {
  conversation_id: string;
  messages: Message[];
  updated_at: number;
}

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

export function getOrCreateConversationId(): string {
  const w = safeWindow();
  if (!w) return cryptoUUID();
  const existing = w.localStorage.getItem(ACTIVE_KEY);
  if (existing) return existing;
  const fresh = cryptoUUID();
  w.localStorage.setItem(ACTIVE_KEY, fresh);
  return fresh;
}

export function setActiveConversationId(id: string) {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(ACTIVE_KEY, id);
}

export function clearActiveConversation() {
  const w = safeWindow();
  if (!w) return;
  const id = w.localStorage.getItem(ACTIVE_KEY);
  if (id) w.localStorage.removeItem(CONV_PREFIX + id);
  w.localStorage.removeItem(ACTIVE_KEY);
}

export function getOrCreateAnonSessionId(): string {
  const w = safeWindow();
  if (!w) return 'anon';
  const existing = w.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = cryptoUUID();
  w.localStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

export function loadConversation(id: string): SavedConversation | null {
  const w = safeWindow();
  if (!w) return null;
  const raw = w.localStorage.getItem(CONV_PREFIX + id);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedConversation;
    if (!parsed.conversation_id || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadActiveConversation(): SavedConversation | null {
  const w = safeWindow();
  if (!w) return null;
  const id = w.localStorage.getItem(ACTIVE_KEY);
  if (!id) return null;
  const saved = loadConversation(id);
  if (!saved) return null;
  if (Date.now() - saved.updated_at > MAX_AGE_MS) return null;
  return saved;
}

export function saveConversation(id: string, messages: Message[]) {
  const w = safeWindow();
  if (!w) return;
  const trimmed =
    messages.length > MAX_MESSAGES
      ? messages.slice(messages.length - MAX_MESSAGES)
      : messages;
  const payload: SavedConversation = {
    conversation_id: id,
    messages: trimmed,
    updated_at: Date.now(),
  };
  try {
    w.localStorage.setItem(CONV_PREFIX + id, JSON.stringify(payload));
    w.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* quota — silently skip */
  }
}

function cryptoUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as Crypto).randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
