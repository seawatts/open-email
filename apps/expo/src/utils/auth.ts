import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import { getAuthBaseUrl } from './base-url';

const configScheme = Constants.expoConfig?.scheme;
const scheme = Array.isArray(configScheme)
  ? configScheme[0]
  : (configScheme ?? 'openemail');

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [
    expoClient({
      scheme,
      storage: SecureStore,
      storagePrefix: 'openemail',
    }),
  ],
});

export const { useSession, signIn, signOut } = authClient;
