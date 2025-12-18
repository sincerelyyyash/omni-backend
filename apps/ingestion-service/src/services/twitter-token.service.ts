import { prisma } from "@repo/database";

export interface TwitterTokenData {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
}

export const getTwitterTokens = async (userId: string): Promise<TwitterTokenData | null> => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "twitter",
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

export const getValidTwitterToken = async (userId: string): Promise<string | null> => {
  const tokens = await getTwitterTokens(userId);

  if (!tokens) {
    return null;
  }

  const now = new Date();
  const expiresAt = tokens.accessTokenExpiresAt;

  if (expiresAt && expiresAt < now) {
    console.warn(`Twitter access token expired for user ${userId}`);
    if (tokens.refreshToken) {
      console.log(`Refresh token available for user ${userId}, but Twitter token refresh not implemented yet`);
    }
    return null;
  }

  return tokens.accessToken;
};
