/**
 * Haptic feedback for OpenBook.
 *
 * On native iOS inside the Capacitor WebView this routes through the
 * Capacitor Haptics plugin (Taptic Engine — sharper, properly tuned
 * impacts). Outside Capacitor (web preview, Android Chrome standalone PWA)
 * it falls back to navigator.vibrate so the feedback still shows up. On
 * desktop or unsupported browsers it is a no-op.
 *
 * Always call these named presets — never call navigator.vibrate or
 * window.Capacitor.Plugins.Haptics directly in app code. This keeps
 * haptics consistent across the app, lets us swap implementations once
 * more, and makes it trivial to add a "Reduce haptics" setting later.
 *
 * Usage:
 *   import { haptics } from '@/lib/haptics';
 *   haptics.tap();        // tile tap, button press, toggle flip
 *   haptics.longPress();  // long-press recognised
 *   haptics.success();    // booking confirmed, payment ok, pin landed
 *   haptics.warning();    // soft validation failure, destructive action
 *   haptics.error();      // payment failed, booking failed
 *   haptics.selection();  // picker / segmented control change
 *
 * We use window.Capacitor globals (not a static import) because the
 * variable-name dynamic-import trick from OpenHouse doesn't work in this
 * Next.js + webpack build — same migration as lib/push-client.ts and
 * lib/native-browser.ts.
 */

type CapacitorHapticsPlugin = {
  impact: (opts: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>;
  notification: (opts: {
    type: 'SUCCESS' | 'WARNING' | 'ERROR';
  }) => Promise<void>;
  selectionStart: () => Promise<void>;
  selectionChanged: () => Promise<void>;
  selectionEnd: () => Promise<void>;
};

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  Plugins?: { Haptics?: CapacitorHapticsPlugin };
};

function isReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function getCapacitorHaptics(): CapacitorHapticsPlugin | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return cap.Plugins?.Haptics ?? null;
}

function fireVibrate(pattern: number | number[]): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on certain patterns. Swallow.
  }
}

/**
 * Fire the plugin call if we're native, otherwise vibrate. Always
 * fire-and-forget: callers don't await haptics, and a Promise rejection
 * from the Capacitor bridge mustn't surface up the call stack.
 */
function fire(
  pluginCall: (h: CapacitorHapticsPlugin) => Promise<void>,
  vibratePattern: number | number[],
): void {
  if (isReduceMotion()) return;
  const plugin = getCapacitorHaptics();
  if (plugin) {
    void pluginCall(plugin).catch(() => {
      // Plugin call failed (permissions, plugin not registered, etc.).
      // Fall back to navigator.vibrate so the user still gets some feel.
      fireVibrate(vibratePattern);
    });
    return;
  }
  fireVibrate(vibratePattern);
}

export const haptics = {
  /** Light tap — tile tap, button press, toggle flip. */
  tap: () =>
    fire((h) => h.impact({ style: 'LIGHT' }), 8),

  /** Long-press recognised — feels like a "click" through the screen. */
  longPress: () =>
    fire((h) => h.impact({ style: 'MEDIUM' }), [0, 18]),

  /** Success — booking confirmed, payment successful, pin landed. */
  success: () =>
    fire((h) => h.notification({ type: 'SUCCESS' }), [0, 12, 60, 24]),

  /** Warning — soft validation failure, destructive action. */
  warning: () =>
    fire((h) => h.notification({ type: 'WARNING' }), 20),

  /** Error — payment failed, booking failed. Three sharp pulses. */
  error: () =>
    fire((h) => h.notification({ type: 'ERROR' }), [0, 14, 40, 14, 40, 14]),

  /** Selection — picker change, segment switch. Very light. */
  selection: () =>
    fire((h) => h.selectionChanged(), 4),
};
