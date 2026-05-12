/**
 * Open a URL in the device's in-app browser when running inside the
 * Capacitor WebView (SFSafariViewController on iOS; Custom Tabs on
 * Android), and fall back to a same-tab navigation on the web.
 *
 * We use the `window.Capacitor` globals injected by Capacitor's WebView
 * bridge rather than a static `import` of `@capacitor/browser`: static
 * imports of native-only modules get bundled into the SSR/web build and
 * fail at runtime in the web context. Variable-name dynamic imports
 * (`const m = '@capacitor/browser'; await import(m)`) don't work either
 * in this Next.js + webpack config — the runtime has no resolver for npm
 * package names and throws "Module name does not resolve to a valid URL"
 * inside the WebView (see lib/push-client.ts for the same migration).
 *
 * `Capacitor.Plugins.Browser` is exposed automatically once the plugin is
 * registered via Package.swift (iOS) / capacitor.config.json (Android).
 */

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Browser?: {
      open: (options: {
        url: string;
        presentationStyle?: 'fullscreen' | 'popover';
        toolbarColor?: string;
      }) => Promise<void>;
    };
  };
};

export async function openCheckout(url: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const Capacitor = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;

  if (Capacitor?.isNativePlatform?.() && Capacitor.Plugins?.Browser) {
    await Capacitor.Plugins.Browser.open({
      url,
      presentationStyle: 'fullscreen',
      toolbarColor: '#080808', // matches root layout themeColor
    });
    return;
  }

  // Web fallback: full-page redirect. Stripe Checkout is a separate origin,
  // so SPA navigation isn't appropriate here.
  window.location.assign(url);
}
