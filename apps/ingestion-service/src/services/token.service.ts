import { prisma } from "@repo/database";
import { google } from "googleapis";

export interface TokenData {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
}

export const getGoogleTokens = async (userId: string): Promise<TokenData | null> => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "google",
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

export const createGoogleOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set to use Google OAuth",
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret);
};

export const refreshGoogleToken = async (
  userId: string,
  refreshToken: string,
): Promise<TokenData | null> => {
  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      return null;
    }

    await prisma.account.updateMany({
      where: {
        userId,
        providerId: "google",
      },
      data: {
        accessToken: credentials.access_token,
        accessTokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
        ...(credentials.refresh_token && {
          refreshToken: credentials.refresh_token,
        }),
      },
    });

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      accessTokenExpiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : null,
      refreshTokenExpiresAt: null,
    };
  } catch (error) {
    console.error("Failed to refresh Google token:", error);
    return null;
  }
};

export const getValidGoogleToken = async (userId: string): Promise<string | null> => {
  const tokens = await getGoogleTokens(userId);

  if (!tokens) {
    return null;
  }

  const now = new Date();
  const expiresAt = tokens.accessTokenExpiresAt;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt && expiresAt < fiveMinutesFromNow) {
    if (!tokens.refreshToken) {
      console.error(`No refresh token available for user ${userId}`);
      return null;
    }

    const refreshed = await refreshGoogleToken(userId, tokens.refreshToken);
    return refreshed?.accessToken || null;
  }

  return tokens.accessToken;
};
