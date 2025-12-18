import { z } from "zod";
import { BaseAgent, type EnrichmentResult } from "./base.agent";
import type { CreateMemoryInput } from "@repo/types";

const notificationClassificationSchema = z.object({
  type: z.string().describe("Notification type: email, pr-review, mention, meeting, bill, action-item, etc."),
  priority: z.enum(["high", "medium", "low"]).describe("Priority level"),
  requiresAction: z.boolean().describe("Whether this notification requires user action"),
  actionType: z.string().nullable().describe("Type of action needed: review, reply, pay, attend, complete, etc."),
  dueDate: z.string().nullable().describe("Due date in ISO format if applicable"),
});

export class NotificationAgent extends BaseAgent {
  async process(
    memory: CreateMemoryInput & { id: number },
  ): Promise<EnrichmentResult> {
    try {
      const prompt = `Analyze this ${memory.source} notification and classify it:

Title: ${memory.title}
Content: ${memory.content.substring(0, 1000)}
Source: ${memory.source}
Timestamp: ${memory.timestamp}
Categories: ${memory.category?.join(", ") || "none"}
Tags: ${memory.tags?.join(", ") || "none"}

Classify this notification:
1. Determine the notification type (email, pr-review, mention, meeting, bill, action-item, etc.)
2. Assess priority (high/medium/low) based on:
   - Content urgency
   - Source importance
   - Time sensitivity
   - User's past interactions
3. Determine if action is required
4. Identify action type if applicable
5. Extract any due dates

Return JSON with: type, priority, requiresAction, actionType, dueDate`;

      const response = await this.llm.invoke(prompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      }

      const result = notificationClassificationSchema.parse(parsed);

      return {
        success: true,
        data: {
          type: result.type,
          priority: result.priority,
          requiresAction: result.requiresAction,
          actionType: result.actionType,
          dueDate: result.dueDate ? new Date(result.dueDate).toISOString() : null,
        },
      };
    } catch (error) {
      console.error("NotificationAgent error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
