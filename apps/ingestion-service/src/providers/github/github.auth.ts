import { getValidGitHubToken } from "../../services/github-token.service";

export interface GitHubClient {
  fetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const createGitHubClient = async (userId: string): Promise<GitHubClient> => {
  const accessToken = await getValidGitHubToken(userId);

  if (!accessToken) {
    throw new Error(`No valid GitHub access token found for user ${userId}`);
  }

  return {
    fetch: async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("Accept", "application/vnd.github+json");
      headers.set("X-GitHub-Api-Version", "2022-11-28");

      return fetch(url, {
        ...options,
        headers,
      });
    },
  };
};
