import Constants, { ExecutionEnvironment } from 'expo-constants';

const PRODUCTION_URL = 'https://open-email-web-app.vercel.app';

function isStandaloneOrProduction(): boolean {
  if (Constants.executionEnvironment === ExecutionEnvironment.Standalone)
    return true;
  const appEnv = (
    Constants.expoConfig?.extra as { APP_ENV?: string } | undefined
  )?.APP_ENV;
  return appEnv === 'production';
}

function getLocalUrl(): string | null {
  if (isStandaloneOrProduction()) return null;

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':')[0];

  if (!localhost) {
    return null;
  }

  return `http://${localhost}:3000`;
}

/**
 * In dev, returns a hostname form of the local URL so Google OAuth accepts the redirect_uri.
 * Google rejects private IPs; sslip.io resolves to the same IP (see https://sslip.io/).
 * Example: http://192.168.0.69:3000 -> http://192-168-0-69.sslip.io:3000
 */
function getLocalAuthBaseUrl(): string | null {
  const localUrl = getLocalUrl();
  if (!localUrl) return null;
  try {
    const u = new URL(localUrl);
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return localUrl;
    const sslipHost = `${host.replaceAll('.', '-')}.sslip.io`;
    const authUrl = `${u.protocol}//${sslipHost}:${u.port || '3000'}`;
    return authUrl;
  } catch {
    return localUrl;
  }
}

export function getAuthBaseUrl(): string {
  const authUrl = getLocalAuthBaseUrl();
  if (authUrl) {
    return authUrl;
  }
  return PRODUCTION_URL;
}

export function getApiBaseUrl(): string {
  const authUrl = getLocalAuthBaseUrl();
  if (authUrl) {
    return authUrl;
  }
  const localUrl = getLocalUrl();
  if (localUrl) {
    return localUrl;
  }
  return PRODUCTION_URL;
}
