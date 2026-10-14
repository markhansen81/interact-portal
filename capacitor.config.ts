import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.interactenglish.ta',
  appName: 'InterACT TA',
  webDir: 'out',
  server: {
    // Point to the live Vercel deployment
    url: 'https://interact-portal.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'InterACT TA',
  },
  android: {
    backgroundColor: '#fffbeb',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#d97706',
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#d97706',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
