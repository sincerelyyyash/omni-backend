import type { GmailMessage } from "./types";
import type { CreateMemoryInput } from "@repo/types";
import { GmailClient } from "./gmail.client";

export class GmailTransformer {
  constructor(private gmailClient: GmailClient) {}

  transformEmailToMemory(
    message: GmailMessage,
    userId: number,
  ): CreateMemoryInput | null {
    if (!message.id) {
      return null;
    }

    const headers = this.gmailClient.extractEmailHeaders(message);
    const body = this.gmailClient.extractEmailBody(message);

    const from = headers.from || "Unknown";
    const subject = headers.subject || "(No Subject)";
    const date = headers.date
      ? new Date(headers.date)
      : new Date(parseInt(message.internalDate));

    const content = `From: ${from}\nSubject: ${subject}\n\n${body}`;

    return {
      userId,
      source: "gmail",
      sourceId: message.id,
      timestamp: date,
      content,
      contentUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      title: subject,
      origin: from,
      tags: this.extractTags(headers),
      category: this.extractCategories(headers),
      type: "email",
      attribute: {
        threadId: message.threadId,
        from,
        to: headers.to || "",
        cc: headers.cc || "",
        date: headers.date || "",
        messageId: message.id,
      },
      summary: message.snippet || subject,
    };
  }

  private extractTags(headers: Record<string, string>): string[] {
    const tags: string[] = [];

    if (headers["x-priority"]) {
      tags.push("priority");
    }

    if (headers["list-id"]) {
      tags.push("mailing-list");
    }

    return tags;
  }

  private extractCategories(headers: Record<string, string>): string[] {
    const categories: string[] = ["email"];

    if (headers["x-gmail-labels"]) {
      const labels = headers["x-gmail-labels"].split(",");
      categories.push(...labels.map((l) => l.trim().toLowerCase()));
    }

    return categories;
  }

  transformEmailsToMemories(
    messages: Array<GmailMessage | null>,
    userId: number,
  ): CreateMemoryInput[] {
    return messages
      .filter((msg): msg is GmailMessage => msg !== null)
      .map((msg) => this.transformEmailToMemory(msg, userId))
      .filter((mem): mem is CreateMemoryInput => mem !== null);
  }
}
