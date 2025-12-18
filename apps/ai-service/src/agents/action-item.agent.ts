import { z } from "zod";
import { BaseAgent, type EnrichmentResult } from "./base.agent";
import type { CreateMemoryInput } from "@repo/types";

const actionItemSchema = z.object({
  items: z.array(
    z.object({
      text: z.string().describe("The action item text"),
      verb: z.string().describe("The action verb: review, approve, follow-up, complete, etc."),
      priority: z.enum(["high", "medium", "low"]).describe("Priority of this action"),
      dueDate: z.string().nullable().describe("Due date in ISO format if mentioned"),
    }),
  ),
});

export class ActionItemAgent extends BaseAgent {
  async process(
    memory: CreateMemoryInput & { id: number },
  ): Promise<EnrichmentResult> {
    try {
      const prompt = `Extract actionable items from this ${memory.source} content:

Title: ${memory.title}
Content: ${memory.content.substring(0, 2000)}

Identify all actionable items. Look for:
- Direct requests ("please review", "can you approve", "follow up on")
- Action verbs (review, approve, complete, follow-up, respond, etc.)
- Deadlines or due dates mentioned
- Tasks that require user action

For each action item, extract:
- The action text
- The action verb
- Priority (high if urgent/deadline, medium if important, low otherwise)
- Due date if mentioned

Return JSON with array of action items. If no action items found, return empty array.`;

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
          return { success: true, data: { items: [] } };
        }
      }

      const result = actionItemSchema.parse(parsed);

      return {
        success: true,
        data: {
          items: result.items.map((item) => ({
            text: item.text,
            verb: item.verb,
            priority: item.priority,
            dueDate: item.dueDate ? new Date(item.dueDate).toISOString() : null,
            memoryId: memory.id,
            source: memory.source,
          })),
        },
      };
    } catch (error) {
      console.error("ActionItemAgent error:", error);
      return {
        success: true,
        data: { items: [] },
      };
    }
  }
}
