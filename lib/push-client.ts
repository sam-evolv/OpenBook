'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
      Plugins?: Record<string, unknown>;
    };
  }
}

export function usePushNotifications(enabled: boolean = true): void {
  const initialised = useRef(false);

  useEffect(() => {
    console.log('[push-client] hook mounted', {
      enabled,
      initialised: initialised.current,
      hasWindow: typeof window !== 'undefined',
    });
    if (!enabled || initialised.current) return;
    if (typeof window === 'undefined') return;
    initialised.current = true;
    console.log('[push-client] calling initFirebaseMessaging');
    void initFirebaseMessaging();
  }, [enabled]);
}

async function initFirebaseMessaging(): Promise<void> {
  console.log('[push-client] init starting');
  try {
    const Capacitor = window.Capacitor;
    if (!Capacitor || !Capacitor.isNativePlatform()) {
      console.log('[push-client] not running on native platform, skipping');
      return;
    }
    console.log('[push-client] Capacitor available', {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
    });

    const FirebaseMessaging = (Capacitor.Plugins as { FirebaseMessaging?: any })?.FirebaseMessaging;
    if (!FirebaseMessaging) {
      console.error('[push-client] FirebaseMessaging plugin not registered');
      return;
    }

    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== 'granted') {
      console.log('[push-client] permission denied');
      return;
    }

    const rawPlatform = Capacitor.getPlatform();
    const platform: 'ios' | 'android' = rawPlatform === 'android' ? 'android' : 'ios';

    const { token } = await FirebaseMessaging.getToken();
    console.log('[push-client] token received', { length: token?.length });
    if (token) await registerWithServer(token, platform);

    await FirebaseMessaging.addListener('tokenReceived', async (event: { token?: string }) => {
      if (event?.token) await registerWithServer(event.token, platform);
    });

    await FirebaseMessaging.addListener('notificationReceivedInForeground', (event: unknown) => {
      console.log('[push-client] foreground notification', event);
    });

    await FirebaseMessaging.addListener(
      'notificationActionPerformed',
      (action: { notification?: { data?: Record<string, string> } }) => {
        const data = action?.notification?.data ?? {};
        if (data.saleId && typeof window !== 'undefined') {
          window.location.assign(`/open-spots/${data.saleId}/confirm`);
        }
      },
    );
  } catch (err) {
    console.error('[push-client] init failed', err);
  }
}

async function registerWithServer(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  try {
    const res = await fetch('/api/notifications/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform }),
    });
    if (!res.ok) {
      console.error('[push-client] register-device failed', res.status);
    } else {
      console.log('[push-client] register-device succeeded');
    }
  } catch (err) {
    console.error('[push-client] register-device network error', err);
  }
}
