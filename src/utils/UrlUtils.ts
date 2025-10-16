/**
 * URL utility functions for Azure DevOps URL construction
 */

/**
 * Ensures a URL has the https:// protocol prefix
 * @param url - The URL that may or may not have a protocol
 * @returns The URL with https:// protocol
 */
export function ensureHttpsProtocol(url: string): string {
  if (!url) return url;

  // If already has a protocol, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Add https:// protocol
  return `https://${url}`;
}

/**
 * Constructs an Azure DevOps work item URL
 * @param organization - Azure DevOps organization URL
 * @param project - Project name
 * @param workItemId - Work item ID
 * @returns Fully qualified work item URL
 */
export function buildWorkItemUrl(organization: string, project: string, workItemId: number | string): string {
  const orgUrl = ensureHttpsProtocol(organization);
  return `${orgUrl}/${encodeURIComponent(project)}/_workitems/edit/${workItemId}`;
}

/**
 * Constructs an Azure DevOps pull request URL
 * @param organization - Azure DevOps organization URL
 * @param project - Project name
 * @param repository - Repository name
 * @param pullRequestId - Pull request ID
 * @returns Fully qualified pull request URL
 */
export function buildPullRequestUrl(
  organization: string,
  project: string,
  repository: string,
  pullRequestId: number | string,
): string {
  const orgUrl = ensureHttpsProtocol(organization);
  return `${orgUrl}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repository)}/pullrequest/${pullRequestId}`;
}

/**
 * Constructs an Azure DevOps build URL
 * @param organization - Azure DevOps organization URL
 * @param project - Project name
 * @param buildId - Build ID
 * @returns Fully qualified build URL
 */
export function buildBuildUrl(organization: string, project: string, buildId: number | string): string {
  const orgUrl = ensureHttpsProtocol(organization);
  return `${orgUrl}/${encodeURIComponent(project)}/_build/results?buildId=${buildId}`;
}
