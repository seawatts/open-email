import type { SupabaseApiKey } from './types';

// Local Supabase demo keys
const LOCAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const LOCAL_SUPABASE_JWT_SECRET =
  'super-secret-jwt-token-with-at-least-32-characters-long';

export function buildLocalDevOverrides(
  apiPort: number,
  dbPort: number,
  betterAuthSecret: string,
  posthogApiKey: string,
  posthogHost: string,
): Record<string, string> {
  return {
    BETTER_AUTH_SECRET: betterAuthSecret,
    NEXT_PUBLIC_POSTHOG_HOST: posthogHost,
    NEXT_PUBLIC_POSTHOG_KEY: posthogApiKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${apiPort}`,
    POSTGRES_DATABASE: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
    POSTGRES_URL: `postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres`,
    POSTHOG_HOST: posthogHost,
    POSTHOG_KEY: posthogApiKey,
    SUPABASE_ANON_KEY: LOCAL_SUPABASE_ANON_KEY,
    SUPABASE_JWT_SECRET: LOCAL_SUPABASE_JWT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: `http://127.0.0.1:${apiPort}`,
  };
}

export function buildSupabaseCredentials(
  projectRef: string,
  region: string,
  dbPassword: string,
  apiKeys: SupabaseApiKey[],
  betterAuthSecret: string,
  posthogApiKey: string,
  posthogHost: string,
): Record<string, string> {
  const anonKey = apiKeys.find((k) => k.name === 'anon')?.api_key;
  const serviceRoleKey = apiKeys.find(
    (k) => k.name === 'service_role',
  )?.api_key;

  if (!anonKey || !serviceRoleKey) {
    throw new Error('Could not find required API keys');
  }

  return {
    BETTER_AUTH_SECRET: betterAuthSecret,
    NEXT_PUBLIC_POSTHOG_HOST: posthogHost,
    NEXT_PUBLIC_POSTHOG_KEY: posthogApiKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
    POSTGRES_PASSWORD: dbPassword,
    POSTGRES_URL: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    POSTHOG_HOST: posthogHost,
    POSTHOG_KEY: posthogApiKey,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_PROJECT_ID: projectRef,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_URL: `https://${projectRef}.supabase.co`,
  };
}
