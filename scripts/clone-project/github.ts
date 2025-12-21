import { apiFetch, p, runCommand } from './utils';

const GITHUB_API_URL = 'https://api.github.com';
const TEMPLATE_REPO = 'seawatts/startup-template';

// GitHub API requires additional headers
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

// ============================================================================
// Types
// ============================================================================

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
}

export interface GitHubUser {
  login: string;
}

export interface GitHubOrg {
  login: string;
  id: number;
}

// ============================================================================
// Git Repository Detection
// ============================================================================

/**
 * Check if we're currently in a git repository
 */
export async function isInGitRepo(): Promise<boolean> {
  const { exitCode } = await runCommand(
    ['git', 'rev-parse', '--is-inside-work-tree'],
    { silent: true },
  );
  return exitCode === 0;
}

/**
 * Check if there's a remote origin configured
 */
export async function hasGitRemote(): Promise<boolean> {
  const { exitCode } = await runCommand(
    ['git', 'config', '--get', 'remote.origin.url'],
    { silent: true },
  );
  return exitCode === 0;
}

/**
 * Get the current git remote URL if it exists
 */
export async function getGitRemoteUrl(): Promise<string | undefined> {
  const { stdout, exitCode } = await runCommand(
    ['git', 'config', '--get', 'remote.origin.url'],
    { silent: true },
  );
  return exitCode === 0 ? stdout.trim() : undefined;
}

/**
 * Parse GitHub repo from a remote URL
 */
export function parseGitHubRepo(url: string): string | undefined {
  const match = url.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  return match ? match[1] : undefined;
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Get GitHub token from environment or gh CLI
 */
export async function getGitHubToken(): Promise<string> {
  // First try environment variable
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  // Try gh CLI
  const { stdout, exitCode } = await runCommand(['gh', 'auth', 'token'], {
    silent: true,
  });

  if (exitCode === 0 && stdout.trim()) {
    return stdout.trim();
  }

  throw new Error(
    'GitHub token not found. Please set GITHUB_TOKEN or run "gh auth login"',
  );
}

// ============================================================================
// Repository Management
// ============================================================================

/**
 * Create a new repository from the startup-template
 */
export async function createRepoFromTemplate(
  token: string,
  repoName: string,
  owner?: string,
  isPrivate = true,
): Promise<GitHubRepo> {
  // Get the authenticated user if no owner specified
  let repoOwner = owner;
  if (!repoOwner) {
    const user = await apiFetch<GitHubUser>(`${GITHUB_API_URL}/user`, token, {
      headers: GITHUB_HEADERS,
    });
    repoOwner = user.login;
  }

  return apiFetch<GitHubRepo>(
    `${GITHUB_API_URL}/repos/${TEMPLATE_REPO}/generate`,
    token,
    {
      body: {
        description: `Created from ${TEMPLATE_REPO}`,
        include_all_branches: false,
        name: repoName,
        owner: repoOwner,
        private: isPrivate,
      },
      headers: GITHUB_HEADERS,
      method: 'POST',
    },
  );
}

/**
 * Clone a repository to the current directory
 */
export async function cloneRepo(
  repoUrl: string,
  directory: string,
): Promise<void> {
  const { exitCode, stderr } = await runCommand([
    'git',
    'clone',
    repoUrl,
    directory,
  ]);

  if (exitCode !== 0) {
    throw new Error(`Failed to clone repository: ${stderr}`);
  }
}

/**
 * Initialize a new git repo and set remote
 */
export async function initGitRepo(remoteUrl: string): Promise<void> {
  const { exitCode: initExit } = await runCommand(['git', 'init'], {
    silent: true,
  });
  if (initExit !== 0) {
    throw new Error('Failed to initialize git repository');
  }

  const { exitCode: remoteExit, stderr } = await runCommand([
    'git',
    'remote',
    'add',
    'origin',
    remoteUrl,
  ]);

  if (remoteExit !== 0 && !stderr.includes('already exists')) {
    throw new Error(`Failed to add remote: ${stderr}`);
  }
}

// ============================================================================
// Organization Management
// ============================================================================

/**
 * List GitHub organizations the user belongs to
 */
export async function listGitHubOrgs(token: string): Promise<GitHubOrg[]> {
  try {
    return await apiFetch<GitHubOrg[]>(`${GITHUB_API_URL}/user/orgs`, token, {
      headers: GITHUB_HEADERS,
    });
  } catch {
    return [];
  }
}

/**
 * Get or select GitHub owner (user or org)
 */
export async function getOrSelectGitHubOwner(
  token: string,
  noInteractive?: boolean,
): Promise<string> {
  const user = await apiFetch<GitHubUser>(`${GITHUB_API_URL}/user`, token, {
    headers: GITHUB_HEADERS,
  });

  const orgs = await listGitHubOrgs(token);

  // No orgs or non-interactive - use personal account
  if (orgs.length === 0 || noInteractive) {
    p.log.success(`Using GitHub account: ${user.login}`);
    return user.login;
  }

  // Interactive selection
  const selected = await p.select({
    message: 'Where should the repository be created?',
    options: [
      { label: `${user.login} (personal)`, value: user.login },
      ...orgs.map((org) => ({ label: org.login, value: org.login })),
    ],
  });

  if (p.isCancel(selected)) {
    throw new Error('Cancelled by user');
  }

  return selected as string;
}
