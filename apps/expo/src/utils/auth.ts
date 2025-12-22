import { expoClient } from '@better-auth/expo/client';
import { lastLoginMethodClient } from '@better-auth/expo/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { getBaseUrl } from './base-url';

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: 'expo',
      storage: SecureStore,
      storagePrefix: 'expo',
    }),
    lastLoginMethodClient({
      storage: SecureStore,
      storagePrefix: 'expo',
    }),
  ],
});
