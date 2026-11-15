import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nuvo.music',
  appName: 'Nuvo',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
