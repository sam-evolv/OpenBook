'use client';

/**
 * Initialise native push notifications on consumer-app boot.
 *
 * We use @capacitor-firebase/messaging so iOS yields an FCM token (not a
 * raw APNs token) — firebase-admin's send() requires FCM tokens, and the
 * bridge plugin transparently converts the APNs registration on device.
 *
 * @capacitor/push-notifications stays installed because its Phase 5
 * AppDelegate forwards (didRegisterForRemoteNotificationsWithDeviceToken
 * etc.) are still what surfaces the APNs token to the Firebase iOS SDK.
 *
 * Modules are dynamically imported via variable names so webpack doesn't
 * pull native-only code into the SSR/web bundle.
 */

import { useEffect, useRef } from 'react';

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
  try {
    console.log('[push-client] init starting');
    const capacitorCore = '@capacitor/core';
    const firebaseMessaging = '@capacitor-firebase/messaging';

    // @ts-ignore - dynamically imported
    const { Capacitor } = await import(/* webpackIgnore: true */ capacitorCore);
    console.log('[push-client] Capacitor imported', {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
    });
    if (!Capacitor.isNativePlatform()) return;

    // @ts-ignore - dynamically imported
    const { FirebaseMessaging } = await import(/* webpackIgnore: true */ firebaseMessaging);

    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== 'granted') {
      console.log('[push-client] permission denied');
      return;
    }

    const rawPlatform = Capacitor.getPlatform();
    const platform: 'ios' | 'android' =
      rawPlatform === 'android' ? 'android' : 'ios';

    const { token } = await FirebaseMessaging.getToken();
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
    }
  } catch (err) {
    console.error('[push-client] register-device network error', err);
  }
}
