import type { PostHogOrg, PostHogProject, PostHogRegion } from './types';
import { apiFetch, p } from './utils';

// ============================================================================
// URL Helpers
// ============================================================================

export function getPostHogApiUrl(region: PostHogRegion): string {
  return region === 'eu' ? 'https://eu.posthog.com' : 'https://us.posthog.com';
}

export function getPostHogHost(region: PostHogRegion): string {
  return region === 'eu'
    ? 'https://eu.i.posthog.com'
    : 'https://us.i.posthog.com';
}

// ============================================================================
// Organization Management
// ============================================================================

export async function listPostHogOrgs(
  personalApiKey: string,
  region: PostHogRegion,
): Promise<PostHogOrg[]> {
  const apiUrl = getPostHogApiUrl(region);
  const data = await apiFetch<{ results: PostHogOrg[] }>(
    `${apiUrl}/api/organizations/`,
    personalApiKey,
  );
  return data.results;
}

export async function createPostHogOrg(
  personalApiKey: string,
  region: PostHogRegion,
  name: string,
): Promise<PostHogOrg> {
  const apiUrl = getPostHogApiUrl(region);
  return apiFetch<PostHogOrg>(`${apiUrl}/api/organizations/`, personalApiKey, {
    body: { name },
    method: 'POST',
  });
}

// ============================================================================
// Project Management
// ============================================================================

export async function createPostHogProject(
  personalApiKey: string,
  region: PostHogRegion,
  orgId: string,
  name: string,
): Promise<PostHogProject> {
  const apiUrl = getPostHogApiUrl(region);
  return apiFetch<PostHogProject>(
    `${apiUrl}/api/organizations/${orgId}/projects/`,
    personalApiKey,
    {
      body: { name },
      method: 'POST',
    },
  );
}

// ============================================================================
// Organization Selection
// ============================================================================

interface GetOrCreatePostHogOrgOptions {
  personalApiKey: string;
  region: PostHogRegion;
  orgName?: string;
  providedOrgId?: string;
  noInteractive?: boolean;
  dryRun?: boolean;
}

export async function getOrCreatePostHogOrg(
  options: GetOrCreatePostHogOrgOptions,
): Promise<PostHogOrg> {
  const {
    personalApiKey,
    region,
    orgName,
    providedOrgId,
    noInteractive,
    dryRun,
  } = options;
  const orgs = await listPostHogOrgs(personalApiKey, region);

  // Helper to create org (handles dry-run)
  const createOrg = async (name: string): Promise<PostHogOrg> => {
    if (dryRun) {
      p.log.info(`Would create new PostHog org: ${name}`);
      return { id: 'dry-run-posthog-org-id', name, slug: name.toLowerCase() };
    }
    p.log.info(`Creating new PostHog org: ${name}`);
    return createPostHogOrg(personalApiKey, region, name);
  };

  // Find by provided ID
  if (providedOrgId) {
    const org = orgs.find((o) => o.id === providedOrgId);
    if (!org) {
      throw new Error(
        `PostHog organization with ID ${providedOrgId} not found`,
      );
    }
    p.log.success(`Using PostHog org: ${org.name} (${org.id})`);
    return org;
  }

  // No orgs exist - must create
  if (orgs.length === 0) {
    if (!orgName) {
      throw new Error(
        'No PostHog organizations found. Please specify --posthog-org-name to create one',
      );
    }
    return createOrg(orgName);
  }

  // Try to match by name if provided
  if (orgName) {
    const matchingOrg = orgs.find(
      (o) => o.name.toLowerCase() === orgName.toLowerCase(),
    );
    if (matchingOrg) {
      p.log.success(
        `Using PostHog org: ${matchingOrg.name} (${matchingOrg.id})`,
      );
      return matchingOrg;
    }
    return createOrg(orgName);
  }

  // Single org - auto-select
  if (orgs.length === 1) {
    p.log.success(`Using PostHog org: ${orgs[0].name} (${orgs[0].id})`);
    return orgs[0];
  }

  // Non-interactive - use first
  if (noInteractive) {
    p.log.success(`Using PostHog org: ${orgs[0].name} (${orgs[0].id})`);
    return orgs[0];
  }

  // Interactive selection
  const selected = await p.select({
    message: 'Select a PostHog organization:',
    options: orgs.map((org) => ({
      label: `${org.name} (${org.id})`,
      value: org.id,
    })),
  });

  if (p.isCancel(selected)) {
    throw new Error('Cancelled by user');
  }

  const selectedOrg = orgs.find((o) => o.id === selected);
  if (!selectedOrg) {
    throw new Error('Invalid selection');
  }
  return selectedOrg;
}

// ============================================================================
// Project Listing & Selection (for sync-secrets)
// ============================================================================

export async function listPostHogProjects(
  personalApiKey: string,
  region: PostHogRegion,
  orgId: string,
): Promise<PostHogProject[]> {
  const apiUrl = getPostHogApiUrl(region);
  const data = await apiFetch<{ results: PostHogProject[] }>(
    `${apiUrl}/api/organizations/${orgId}/projects/`,
    personalApiKey,
  );
  return data.results;
}

export async function selectPostHogProject(
  personalApiKey: string,
  region: PostHogRegion,
  noInteractive?: boolean,
): Promise<{ org: PostHogOrg; project: PostHogProject }> {
  // First select org
  const org = await getOrCreatePostHogOrg({
    noInteractive,
    personalApiKey,
    region,
  });

  // Then list projects in that org
  const projects = await listPostHogProjects(personalApiKey, region, org.id);

  if (projects.length === 0) {
    throw new Error(
      `No PostHog projects found in org "${org.name}". Create one first.`,
    );
  }

  // Non-interactive or single project - auto-select
  if (noInteractive || projects.length === 1) {
    p.log.success(`Using PostHog project: ${projects[0].name}`);
    return { org, project: projects[0] };
  }

  // Interactive selection
  const selected = await p.select({
    message: 'Select a PostHog project to sync from:',
    options: projects.map((proj) => ({
      label: proj.name,
      value: proj.id,
    })),
  });

  if (p.isCancel(selected)) {
    throw new Error('Cancelled by user');
  }

  const selectedProject = projects.find((proj) => proj.id === selected);
  if (!selectedProject) {
    throw new Error('Invalid selection');
  }

  return { org, project: selectedProject };
}

// ============================================================================
// Secret Fetching (for sync-secrets)
// ============================================================================

export interface PostHogSecrets {
  /** Secrets for all environments (same values) */
  secrets: Record<string, string>;
}

/**
 * Fetch all available secrets from a PostHog project.
 * PostHog secrets are the same for all environments.
 */
export function getPostHogProjectSecrets(
  project: PostHogProject,
  region: PostHogRegion,
): PostHogSecrets {
  const host = getPostHogHost(region);

  return {
    secrets: {
      NEXT_PUBLIC_POSTHOG_HOST: host,
      NEXT_PUBLIC_POSTHOG_KEY: project.api_token,
      POSTHOG_HOST: host,
      POSTHOG_KEY: project.api_token,
    },
  };
}
