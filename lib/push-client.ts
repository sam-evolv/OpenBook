'use client';

/**
 * Initialise native push notifications on consumer-app boot.
 *
 * Capacitor-only for v1 — when not running inside the native shell
 * (web/preview), the hook is a no-op. A future PR can add Web Push
 * once there's real demand; until then web users are silently skipped.
 *
 * Both Capacitor modules are dynamically imported via variable names so
 * webpack doesn't try to bundle them into the SSR build (they're native-
 * only and would error during prerender). The variable defeats static
 * analysis; the magic comment is belt-and-braces.
 *
 * Mounted from app/(consumer)/layout-client.tsx — the hook runs once
 * per session (guarded by a ref) so re-renders don't re-request
 * permissions or re-register listeners.
 */

import { useEffect, useRef } from 'react';

type CapacitorModule = {
  Capacitor: {
    isNativePlatform: () => boolean;
    getPlatform: () => string;
  };
};

type PushPermissionResult = { receive: 'granted' | 'denied' | 'prompt' };
type RegistrationToken = { value: string };
type PushListener = { remove: () => Promise<void> };

type PushNotificationsModule = {
  PushNotifications: {
    requestPermissions: () => Promise<PushPermissionResult>;
    register: () => Promise<void>;
    addListener: (event: string, handler: (data: unknown) => void) => Promise<PushListener>;
  };
};

export function usePushNotifications(enabled: boolean = true): void {
  const initialised = useRef(false);

  useEffect(() => {
    if (!enabled || initialised.current) return;
    if (typeof window === 'undefined') return;
    initialised.current = true;
    void initCapacitorPush();
  }, [enabled]);
}

async function initCapacitorPush(): Promise<void> {
  try {
    const capacitorCoreModule = '@capacitor/core';
    const capacitorPushModule = '@capacitor/push-notifications';

    const core = (await import(/* webpackIgnore: true */ capacitorCoreModule)) as
      | CapacitorModule
      | { default: CapacitorModule };
    const Capacitor = ('default' in core ? core.default.Capacitor : core.Capacitor);

    if (!Capacitor.isNativePlatform()) {
      // Web/preview: no native bridge, nothing to register against.
      return;
    }

    const push = (await import(/* webpackIgnore: true */ capacitorPushModule)) as
      | PushNotificationsModule
      | { default: PushNotificationsModule };
    const { PushNotifications } = ('default' in push ? push.default : push);

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      console.log('[push-client] notification permission denied');
      return;
    }

    await PushNotifications.register();

    await PushNotifications.addListener('registration', async (raw) => {
      const token = (raw as RegistrationToken).value;
      const platform = Capacitor.getPlatform();
      const safePlatform =
        platform === 'ios' || platform === 'android' || platform === 'web'
          ? platform
          : 'ios';
      try {
        const res = await fetch('/api/notifications/register-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform: safePlatform }),
        });
        if (!res.ok) {
          console.error('[push-client] register-device failed', res.status);
        }
      } catch (err) {
        console.error('[push-client] register-device network error', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[push-client] registration error', err);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // Foreground delivery — iOS suppresses the banner unless explicitly
      // requested. We log for now; PR 4b will surface an in-app toast.
      console.log('[push-client] foreground notification', notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      // User tapped the notification (background or banner). Deep-link
      // when the payload includes a saleId — PR 4b's standing-alert
      // dispatcher emits this shape.
      const payload = action as { notification?: { data?: Record<string, string> } };
      const saleId = payload.notification?.data?.saleId;
      if (saleId) {
        window.location.assign(`/open-spots/${saleId}/confirm`);
      }
    });
  } catch (err) {
    console.error('[push-client] init failed', err);
  }
}
