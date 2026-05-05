import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'ie.openbook.app',
  appName: 'OpenBook',
  webDir: 'out',
  ...(isProduction
    ? {}
    : {
        server: {
          url: 'https://app.openbook.ie',
          cleartext: false,
        },
      }),
};

export default config;
