/**
 * Firebase Cloud Messaging integration — server-side push notification
 * relay. FCM forwards to APNs (iOS) and FCM-direct (Android, later).
 *
 * firebase-admin is lazy-loaded via a variable-name import to keep it
 * out of the Next.js bundle. The variable defeats webpack's static
 * analysis; the magic comment is belt-and-braces.
 *
 * Configure via FIREBASE_SERVICE_ACCOUNT (the JSON contents of a
 * Firebase service account key, as a single string). When unset,
 * sends fail closed with a logged warning — no crash.
 */

import { supabaseAdmin } from './supabase';

type FirebaseMessaging = {
  send: (message: unknown) => Promise<string>;
  sendEachForMulticast: (message: unknown) => Promise<{
    successCount: number;
    failureCount: number;
    responses: Array<{ success: boolean; error?: { code?: string; message?: string } }>;
  }>;
};

type FirebaseAdminModule = {
  apps: unknown[];
  initializeApp: (config: { credential: unknown }) => void;
  credential: { cert: (serviceAccount: unknown) => unknown };
  messaging: () => FirebaseMessaging;
};

let firebaseAdminCache: FirebaseAdminModule | null = null;

async function getFirebaseAdmin(): Promise<FirebaseAdminModule | null> {
  if (firebaseAdminCache) return firebaseAdminCache;

  try {
    const moduleName = 'firebase-admin';
    const imported = (await import(/* webpackIgnore: true */ moduleName)) as unknown;

    // CJS-via-ESM may surface the module as `default` or as a flat namespace.
    const admin = (
      imported && typeof imported === 'object' && 'default' in imported
        ? ((imported as { default: unknown }).default ?? imported)
        : imported
    ) as FirebaseAdminModule;

    if (!admin.apps.length) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccountJson) {
        console.warn('[push] FIREBASE_SERVICE_ACCOUNT not configured — sends will fail');
        return null;
      }
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    firebaseAdminCache = admin;
    return admin;
  } catch (err) {
    console.error('[push] firebase-admin lazy-load failed', err);
    return null;
  }
}

export type PushKind =
  | 'standing_slot_match'
  | 'booking_reminder_24h'
  | 'booking_reminder_2h'
  | 'favourite'
  | 'wider'
  | 'test';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  /**
   * Idempotency key — prevents the same logical notification firing
   * twice if both standing-alert and favourite matchers resolve to
   * the same customer for the same sale. Used by PR 4b's dispatcher.
   */
  dedupeKey?: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

export interface BatchSendResult {
  success: number;
  failure: number;
  invalidTokens: string[];
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

/**
 * Send a push notification to a single device token.
 *
 * Writes to push_log on both success and failure. Auto-deactivates
 * the token row if FCM reports it as invalid or unregistered.
 */
export async function sendPush(
  customerId: string,
  token: string,
  payload: PushPayload,
  kind: PushKind,
): Promise<SendResult> {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    await logPushAttempt(customerId, kind, null, false, 'firebase_not_configured');
    return { success: false, error: 'firebase_not_configured' };
  }

  const message = {
    token,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
    apns: {
      payload: {
        aps: {
          badge: payload.badge,
          sound: payload.sound ?? 'default',
          'content-available': 1,
        },
      },
    },
  };

  try {
    await admin.messaging().send(message);
    await logPushAttempt(customerId, kind, null, true, null);
    return { success: true };
  } catch (err: unknown) {
    const errCode = extractCode(err);
    if (errCode && INVALID_TOKEN_CODES.has(errCode)) {
      await deactivateTokens([token]);
    }
    const errMessage = errCode ?? (err instanceof Error ? err.message : 'send_failed');
    await logPushAttempt(customerId, kind, null, false, errMessage);
    return { success: false, error: errMessage };
  }
}

/**
 * Send to multiple tokens via FCM multicast. Batches at 500
 * (FCM's hard limit per request). Returns aggregate counts and the
 * tokens FCM rejected as unregistered — those rows are also
 * deactivated as a side effect.
 */
export async function sendPushBatch(
  tokens: Array<{ customerId: string; token: string }>,
  payload: PushPayload,
  kind: PushKind,
): Promise<BatchSendResult> {
  if (tokens.length === 0) {
    return { success: 0, failure: 0, invalidTokens: [] };
  }

  const admin = await getFirebaseAdmin();
  if (!admin) {
    await Promise.all(
      tokens.map((t) => logPushAttempt(t.customerId, kind, null, false, 'firebase_not_configured')),
    );
    return { success: 0, failure: tokens.length, invalidTokens: [] };
  }

  const BATCH_SIZE = 500;
  let totalSuccess = 0;
  let totalFailure = 0;
  const allInvalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const message = {
      tokens: batch.map((t) => t.token),
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      apns: {
        payload: {
          aps: {
            sound: payload.sound ?? 'default',
            'content-available': 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      await Promise.all(
        response.responses.map((resp, idx) =>
          logPushAttempt(
            batch[idx].customerId,
            kind,
            null,
            resp.success,
            resp.success ? null : (resp.error?.code ?? resp.error?.message ?? 'send_failed'),
          ),
        ),
      );

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code && INVALID_TOKEN_CODES.has(resp.error.code)) {
          allInvalidTokens.push(batch[idx].token);
        }
      });

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;
    } catch (err) {
      console.error('[push] batch send failed', err);
      const errMessage = err instanceof Error ? err.message : 'batch_failed';
      await Promise.all(
        batch.map((t) => logPushAttempt(t.customerId, kind, null, false, errMessage)),
      );
      totalFailure += batch.length;
    }
  }

  if (allInvalidTokens.length > 0) {
    await deactivateTokens(allInvalidTokens);
  }

  return { success: totalSuccess, failure: totalFailure, invalidTokens: allInvalidTokens };
}

// --- internals ---

function extractCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

async function deactivateTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  try {
    const sb = supabaseAdmin();
    await sb.from('push_device_tokens').update({ is_active: false }).in('token', tokens);
  } catch (err) {
    console.error('[push] deactivateTokens failed', err);
  }
}

async function logPushAttempt(
  customerId: string,
  kind: PushKind,
  saleId: string | null,
  delivered: boolean,
  error: string | null,
): Promise<void> {
  try {
    const sb = supabaseAdmin();
    await sb.from('push_log').insert({
      customer_id: customerId,
      kind,
      sale_id: saleId,
      delivered,
      error,
    });
  } catch (err) {
    // Never let an audit-log write fail the user-visible send path.
    console.error('[push] log write failed', err);
  }
}

/**
 * Test-only escape hatch to reset the lazy-init cache between vitest cases.
 * Not exported through the package; callers reach it via the test seam below.
 */
export function __resetForTests(): void {
  firebaseAdminCache = null;
}
