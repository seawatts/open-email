import type { VercelProject, VercelTeam } from './types';
import { apiFetch, p, runCommand } from './utils';

const VERCEL_API_URL = 'https://api.vercel.com';

// ============================================================================
// Team Management
// ============================================================================

export async function listVercelTeams(token: string): Promise<VercelTeam[]> {
  const data = await apiFetch<{ teams: VercelTeam[] }>(
    `${VERCEL_API_URL}/v2/teams`,
    token,
  );
  return data.teams;
}

// ============================================================================
// Git Integration
// ============================================================================

export async function getGitRepoFromRemote(): Promise<string> {
  const { stdout, exitCode } = await runCommand(
    ['git', 'config', '--get', 'remote.origin.url'],
    { silent: true },
  );

  if (exitCode !== 0) {
    throw new Error('Failed to get git remote origin URL');
  }

  const url = stdout.trim();
  const match = url.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (match) {
    return match[1];
  }

  throw new Error(`Could not parse GitHub repository from URL: ${url}`);
}

// ============================================================================
// Project Management
// ============================================================================

interface CreateVercelProjectOptions {
  token: string;
  projectName: string;
  gitRepo: string;
  teamId?: string;
  framework?: string;
  rootDirectory?: string;
}

export async function createVercelProject(
  options: CreateVercelProjectOptions,
): Promise<VercelProject> {
  const {
    token,
    projectName,
    gitRepo,
    teamId,
    framework = 'nextjs',
    rootDirectory = 'apps/web-app',
  } = options;

  const url = teamId
    ? `${VERCEL_API_URL}/v10/projects?teamId=${teamId}`
    : `${VERCEL_API_URL}/v10/projects`;

  return apiFetch<VercelProject>(url, token, {
    body: {
      buildCommand: 'cd ../.. && bun run build --filter=@seawatts/web-app',
      framework,
      gitRepository: {
        repo: gitRepo,
        type: 'github',
      },
      installCommand: 'bun install',
      name: projectName,
      rootDirectory,
    },
    method: 'POST',
  });
}

// ============================================================================
// Team Selection
// ============================================================================

interface GetOrSelectVercelTeamOptions {
  token: string;
  providedTeamId?: string;
  providedTeamSlug?: string;
  noInteractive?: boolean;
}

export async function getOrSelectVercelTeam(
  options: GetOrSelectVercelTeamOptions,
): Promise<string | undefined> {
  const { token, providedTeamId, providedTeamSlug, noInteractive } = options;

  // Direct ID provided
  if (providedTeamId) {
    p.log.success(`Using provided Vercel team ID: ${providedTeamId}`);
    return providedTeamId;
  }

  const teams = await listVercelTeams(token);

  // No teams - use personal account
  if (teams.length === 0) {
    p.log.info('No Vercel teams found, using personal account');
    return undefined;
  }

  // Find by slug if provided
  if (providedTeamSlug) {
    const team = teams.find(
      (t) => t.slug.toLowerCase() === providedTeamSlug.toLowerCase(),
    );
    if (!team) {
      throw new Error(`Vercel team with slug "${providedTeamSlug}" not found`);
    }
    p.log.success(`Using Vercel team: ${team.name} (${team.slug})`);
    return team.id;
  }

  // Single team - auto-select
  if (teams.length === 1) {
    p.log.success(`Using Vercel team: ${teams[0].name} (${teams[0].slug})`);
    return teams[0].id;
  }

  // Non-interactive - use first team
  if (noInteractive) {
    p.log.success(`Using Vercel team: ${teams[0].name} (${teams[0].slug})`);
    return teams[0].id;
  }

  // Interactive selection (includes personal account option)
  const selected = await p.select({
    message: 'Select a Vercel team (or personal account):',
    options: [
      { label: 'Personal Account', value: '__personal__' },
      ...teams.map((team) => ({
        label: `${team.name} (${team.slug})`,
        value: team.id,
      })),
    ],
  });

  if (p.isCancel(selected)) {
    throw new Error('Cancelled by user');
  }

  return selected === '__personal__' ? undefined : (selected as string);
}
