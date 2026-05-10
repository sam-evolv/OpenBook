import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ie.openbook.app',
  appName: 'OpenBook',
  webDir: 'ios-web',
  server: {
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.openbook.ie',
    cleartext: false,
  },
};

export default config;
