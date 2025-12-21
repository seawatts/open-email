import type { Environment } from './types';
import { apiFetch, isVerbose, p } from './utils';

const INFISICAL_API_URL = 'https://app.infisical.com/api';

// ============================================================================
// Types
// ============================================================================

export interface VercelConnection {
  id: string;
  name: string;
  app: string;
}

export interface VercelSync {
  id: string;
  name: string;
  syncStatus: string;
}

// ============================================================================
// Connections
// ============================================================================

/**
 * List existing Vercel connections in Infisical
 */
export async function listVercelConnections(
  token: string,
  orgId: string,
): Promise<VercelConnection[]> {
  try {
    const data = await apiFetch<{
      appConnections: Array<{ id: string; name: string; app: string }>;
    }>(`${INFISICAL_API_URL}/v1/app-connections?orgId=${orgId}`, token);
    return data.appConnections.filter((c) => c.app === 'vercel');
  } catch (error) {
    if (isVerbose()) {
      p.log.warn(
        `Failed to list connections: ${error instanceof Error ? error.message : error}`,
      );
    }
    return [];
  }
}

// ============================================================================
// Sync Management
// ============================================================================

interface CreateVercelSyncOptions {
  projectId: string;
  connectionId: string;
  name: string;
  environment: Environment;
  secretPath: string;
  vercelProjectId: string;
  vercelEnv: 'development' | 'preview' | 'production';
  vercelTeamId?: string;
  vercelProjectName: string;
}

/**
 * Create a Vercel Sync in Infisical
 * @see https://infisical.com/docs/integrations/secret-syncs/vercel
 */
export async function createVercelSync(
  token: string,
  options: CreateVercelSyncOptions,
): Promise<VercelSync> {
  const data = await apiFetch<{ secretSync: VercelSync }>(
    `${INFISICAL_API_URL}/v1/secret-syncs/vercel`,
    token,
    {
      body: {
        connectionId: options.connectionId,
        destinationConfig: {
          app: options.vercelProjectId,
          appName: options.vercelProjectName,
          env: options.vercelEnv,
          teamId: options.vercelTeamId,
        },
        environment: options.environment,
        isEnabled: true,
        name: options.name,
        projectId: options.projectId,
        secretPath: options.secretPath,
        syncOptions: {
          initialSyncBehavior: 'overwrite-destination',
        },
      },
      method: 'POST',
    },
  );
  return data.secretSync;
}

/**
 * Get environment slug for Infisical API
 */
export function getInfisicalEnvSlug(env: Environment): string {
  return env; // dev, staging, prod map directly
}

/**
 * Map Infisical environment to Vercel environment
 */
export function mapToVercelEnv(
  env: Environment,
): 'development' | 'preview' | 'production' {
  switch (env) {
    case 'dev':
      return 'development';
    case 'staging':
      return 'preview';
    case 'prod':
      return 'production';
  }
}
