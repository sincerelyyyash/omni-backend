import { getValidTwitterToken } from "../../services/twitter-token.service";

export interface TwitterClient {
  fetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const createTwitterClient = async (userId: string): Promise<TwitterClient> => {
  const accessToken = await getValidTwitterToken(userId);

  if (!accessToken) {
    throw new Error(`No valid Twitter access token found for user ${userId}`);
  }

  return {
    fetch: async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("Content-Type", "application/json");

      return fetch(url, {
        ...options,
        headers,
      });
    },
  };
};
