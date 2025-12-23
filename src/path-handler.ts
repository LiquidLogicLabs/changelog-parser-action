import * as fs from 'fs';
import * as path from 'path';

/**
 * Converts blob URLs to raw URLs for various git platforms
 */
export function convertBlobToRaw(url: string): string {
  // GitHub cloud: github.com/owner/repo/blob/ref/path -> raw.githubusercontent.com/owner/repo/ref/path
  const githubBlobMatch = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (githubBlobMatch) {
    const [, domain, owner, repo, rest] = githubBlobMatch;
    if (domain === 'github.com') {
      // GitHub cloud uses different domain
      return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
    } else {
      // GitHub Enterprise uses same domain, just replace /blob/ with /raw/
      return url.replace('/blob/', '/raw/');
    }
  }

  // GitLab: gitlab.com/owner/repo/-/blob/ref/path -> gitlab.com/owner/repo/-/raw/ref/path
  if (url.includes('/-/blob/')) {
    return url.replace('/-/blob/', '/-/raw/');
  }

  // Gitea: gitea.com/owner/repo/src/branch/ref/path -> gitea.com/owner/repo/raw/branch/ref/path
  if (url.includes('/src/branch/')) {
    return url.replace('/src/branch/', '/raw/branch/');
  }

  // Bitbucket: bitbucket.org/owner/repo/src/ref/path -> bitbucket.org/owner/repo/raw/ref/path
  if (url.includes('/src/') && !url.includes('/src/branch/')) {
    // Only replace /src/ if it's not part of /src/branch/ (Gitea pattern)
    return url.replace('/src/', '/raw/');
  }

  // If no conversion needed, return as-is
  return url;
}

/**
 * Detects if a path is a URL
 */
export function isUrl(pathOrUrl: string): boolean {
  return pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://');
}

/**
 * Detects if a URL is a repository root (not a file path)
 */
export function isRepoRootUrl(url: string): boolean {
  if (!isUrl(url)) {
    return false;
  }

  // Remove trailing slash
  const normalizedUrl = url.replace(/\/$/, '');

  // Check if URL contains paths that indicate it's NOT a repo root
  if (
    normalizedUrl.includes('/blob/') ||
    normalizedUrl.includes('/-/blob/') ||
    normalizedUrl.includes('/raw/') ||
    normalizedUrl.includes('/-/raw/') ||
    normalizedUrl.includes('/src/') ||
    normalizedUrl.match(/\.(md|txt|json|yml|yaml|js|ts|py|java|cpp|h|hpp)$/i)
  ) {
    return false;
  }

  // Pattern: https?://[domain]/[owner]/[repo] or https?://[domain]/[owner]/[repo]/
  // Should match exactly 3 path segments after domain
  const repoRootMatch = normalizedUrl.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  return repoRootMatch !== null;
}

/**
 * Constructs CHANGELOG.md URL from repository URL and ref
 */
export function constructChangelogUrl(repoUrl: string, ref: string): string {
  // Remove trailing slash
  const normalizedUrl = repoUrl.replace(/\/$/, '');
  
  // Parse the repository URL
  const urlMatch = normalizedUrl.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!urlMatch) {
    throw new Error(`Invalid repository URL format: ${repoUrl}`);
  }

  const [, domain, owner, repo] = urlMatch;

  // Determine platform and construct appropriate raw URL
  if (domain === 'github.com') {
    // GitHub cloud: use raw.githubusercontent.com
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/CHANGELOG.md`;
  } else if (domain.includes('github')) {
    // GitHub Enterprise: same domain, use /raw/ path
    return `https://${domain}/${owner}/${repo}/raw/${ref}/CHANGELOG.md`;
  } else if (domain.includes('gitlab')) {
    // GitLab: cloud or enterprise
    return `https://${domain}/${owner}/${repo}/-/raw/${ref}/CHANGELOG.md`;
  } else if (domain.includes('bitbucket')) {
    // Bitbucket: cloud or server
    return `https://${domain}/${owner}/${repo}/raw/${ref}/CHANGELOG.md`;
  } else if (domain.includes('gitea')) {
    // Gitea: cloud or self-hosted
    return `https://${domain}/${owner}/${repo}/raw/branch/${ref}/CHANGELOG.md`;
  } else {
    // Unknown platform - try GitHub-style format as fallback
    return `https://${domain}/${owner}/${repo}/raw/${ref}/CHANGELOG.md`;
  }
}

/**
 * Reads content from a local file or remote URL
 */
export async function readContent(
  pathOrUrl: string,
  token?: string
): Promise<string> {
  if (isUrl(pathOrUrl)) {
    return await fetchRemoteUrl(pathOrUrl, token);
  } else {
    return await readLocalFile(pathOrUrl);
  }
}

/**
 * Fetches content from a remote URL
 */
async function fetchRemoteUrl(url: string, token?: string): Promise<string> {
  // Convert blob URLs to raw URLs
  const rawUrl = convertBlobToRaw(url);

  const headers: Record<string, string> = {};
  if (token) {
    // Try Bearer token first (most common), fallback to token format
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(rawUrl, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      // If Bearer token failed, try token format (for GitHub)
      if (response.status === 401 && token && headers['Authorization']?.startsWith('Bearer ')) {
        headers['Authorization'] = `token ${token}`;
        const retryResponse = await fetch(rawUrl, {
          headers,
          redirect: 'follow',
        });
        if (!retryResponse.ok) {
          throw new Error(
            `Failed to fetch ${rawUrl}: ${retryResponse.status} ${retryResponse.statusText}`
          );
        }
        return await retryResponse.text();
      }
      throw new Error(
        `Failed to fetch ${rawUrl}: ${response.status} ${response.statusText}`
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error fetching ${rawUrl}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Reads content from a local file
 */
async function readLocalFile(filePath: string): Promise<string> {
  try {
    // Resolve relative paths
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    return await fs.promises.readFile(resolvedPath, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error reading file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

