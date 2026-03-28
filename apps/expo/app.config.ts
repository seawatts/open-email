import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'development';
const IS_PRODUCTION = APP_ENV === 'production';

const APP_SCHEME = IS_PRODUCTION ? 'openemail' : `openemail-${APP_ENV}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    adaptiveIcon: {
      backgroundColor: '#1F104A',
      foregroundImage: './assets/icon.png',
    },
    package: IS_PRODUCTION
      ? 'com.seawatts.openemail'
      : `com.seawatts.openemail.${APP_ENV}`,
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
  },
  extra: {
    APP_ENV,
  },
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: IS_PRODUCTION
      ? 'com.seawatts.openemail'
      : `com.seawatts.openemail.${APP_ENV}`,
    infoPlist: {
      ...(APP_ENV === 'development'
        ? {
            NSAppTransportSecurity: {
              NSExceptionDomains: {
                'sslip.io': {
                  NSExceptionAllowsInsecureHTTPLoads: true,
                  NSIncludesSubdomains: true,
                },
              },
            },
          }
        : {}),
    },
    supportsTablet: true,
  },
  name: IS_PRODUCTION ? 'Open Email' : `Open Email (${APP_ENV})`,
  orientation: 'portrait',
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1F104A',
        image: './assets/icon.png',
        imageWidth: 200,
      },
    ],
  ],
  scheme: APP_SCHEME,
  slug: 'open-email',
  splash: {
    backgroundColor: '#1F104A',
    image: './assets/icon.png',
    resizeMode: 'contain',
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  userInterfaceStyle: 'automatic',
  version: '0.1.0',
});
