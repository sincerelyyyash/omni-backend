import type { gmail_v1 } from "googleapis";
import type { GmailMessage, GmailFetchOptions } from "./types";

export class GmailClient {
  constructor(private gmail: gmail_v1.Gmail) {}

  async listMessages(options: GmailFetchOptions = {}): Promise<string[]> {
    const {
      maxResults = 50,
      query = "in:inbox",
      labelIds = ["INBOX"],
    } = options;

    const response = await this.gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: query,
      labelIds,
    });

    return response.data.messages?.map((msg) => msg.id || "") || [];
  }

  async getMessage(messageId: string): Promise<GmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      if (!response.data) {
        return null;
      }

      return {
        id: response.data.id || "",
        threadId: response.data.threadId || "",
        snippet: response.data.snippet || "",
        payload: response.data.payload as GmailMessage["payload"],
        internalDate: response.data.internalDate || "",
        sizeEstimate: response.data.sizeEstimate || 0,
      };
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error);
      return null;
    }
  }

  async getMessages(
    messageIds: string[],
  ): Promise<Array<GmailMessage | null>> {
    const results = await Promise.allSettled(
      messageIds.map((id) => this.getMessage(id)),
    );

    return results.map((result) =>
      result.status === "fulfilled" ? result.value : null,
    );
  }

  extractEmailBody(message: GmailMessage): string {
    const { payload } = message;

    if (!payload) {
      return message.snippet || "";
    }

    if (payload.body?.data) {
      try {
        return Buffer.from(payload.body.data, "base64").toString("utf-8");
      } catch {
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          try {
            return Buffer.from(part.body.data, "base64").toString("utf-8");
          } catch {
            continue;
          }
        }

        if (part.mimeType === "text/html" && part.body?.data) {
          try {
            return Buffer.from(part.body.data, "base64").toString("utf-8");
          } catch {
            continue;
          }
        }

        if (part.parts) {
          for (const nestedPart of part.parts) {
            if (
              (nestedPart.mimeType === "text/plain" ||
                nestedPart.mimeType === "text/html") &&
              nestedPart.body?.data
            ) {
              try {
                return Buffer.from(nestedPart.body.data, "base64").toString(
                  "utf-8",
                );
              } catch {
                continue;
              }
            }
          }
        }
      }
    }

    return message.snippet || "";
  }

  extractEmailHeaders(message: GmailMessage): Record<string, string> {
    const headers: Record<string, string> = {};
    const payload = message.payload;

    if (payload?.headers) {
      for (const header of payload.headers) {
        if (header.name && header.value) {
          headers[header.name.toLowerCase()] = header.value;
        }
      }
    }

    return headers;
  }
}
