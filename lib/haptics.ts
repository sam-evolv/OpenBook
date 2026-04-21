/**
 * Haptic feedback for OpenBook.
 *
 * On iOS PWAs installed to home screen, navigator.vibrate triggers the Taptic
 * Engine. On Android it triggers the vibration motor. On desktop or
 * unsupported browsers it is a no-op.
 *
 * Always call these named presets — never call navigator.vibrate directly in
 * app code. This keeps haptics consistent across the app and makes it trivial
 * to add a "Reduce haptics" setting later.
 *
 * Usage:
 *   import { haptics } from '@/lib/haptics';
 *   haptics.tap();        // tile tap, button press, toggle
 *   haptics.longPress();  // long-press recognised
 *   haptics.success();    // booking confirmed, payment ok
 *   haptics.warning();    // soft validation failure
 *   haptics.error();      // payment failed, booking failed
 *   haptics.selection();  // picker / segmented control change
 */

type VibratePattern = number | number[];

function fire(pattern: VibratePattern): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;

  // Respect reduce-motion — many users with vestibular issues also want
  // haptics dampened.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on certain patterns. Swallow.
  }
}

export const haptics = {
  /** Light tap — tile tap, button press, toggle flip. */
  tap: () => fire(8),

  /** Long-press recognised — feels like a "click" through the screen. */
  longPress: () => fire([0, 18]),

  /** Success — booking confirmed, payment successful. Two-pulse "ta-da". */
  success: () => fire([0, 12, 60, 24]),

  /** Warning — soft validation failure. Single firm pulse. */
  warning: () => fire(20),

  /** Error — payment failed, booking failed. Three sharp pulses. */
  error: () => fire([0, 14, 40, 14, 40, 14]),

  /** Selection — picker change, segment switch. Very light. */
  selection: () => fire(4),
};
