import { prisma } from "@repo/database";

export interface GitHubTokenData {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
}

export const getGitHubTokens = async (userId: string): Promise<GitHubTokenData | null> => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "github",
    },
    select: {
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
      refreshTokenExpiresAt: true,
    },
  });

  if (!account || !account.accessToken) {
    return null;
  }

  return {
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    accessTokenExpiresAt: account.accessTokenExpiresAt,
    refreshTokenExpiresAt: account.refreshTokenExpiresAt,
  };
};

export const getValidGitHubToken = async (userId: string): Promise<string | null> => {
  const tokens = await getGitHubTokens(userId);

  if (!tokens) {
    return null;
  }

  const now = new Date();
  const expiresAt = tokens.accessTokenExpiresAt;

  if (expiresAt && expiresAt < now) {
    console.warn(`GitHub access token expired for user ${userId}`);
    return null;
  }

  return tokens.accessToken;
};
