import { google } from "googleapis";
import { getValidGoogleToken, createGoogleOAuthClient } from "../../services/token.service";

export const createGmailClient = async (userId: string) => {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    throw new Error(`No valid Google access token found for user ${userId}`);
  }

  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
};
