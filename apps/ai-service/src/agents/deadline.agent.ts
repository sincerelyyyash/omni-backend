import { z } from "zod";
import { BaseAgent, type EnrichmentResult } from "./base.agent";
import type { CreateMemoryInput } from "@repo/types";

const deadlineSchema = z.object({
  deadlines: z.array(
    z.object({
      text: z.string().describe("Description of the deadline"),
      dueDate: z.string().describe("Due date in ISO format"),
      urgency: z.enum(["high", "medium", "low"]).describe("Urgency based on proximity to due date"),
    }),
  ),
});

export class DeadlineAgent extends BaseAgent {
  async process(
    memory: CreateMemoryInput & { id: number },
  ): Promise<EnrichmentResult> {
    try {
      const now = new Date();
      const memoryDate = new Date(memory.timestamp);

      const prompt = `Extract deadlines and time-sensitive items from this ${memory.source} content:

Title: ${memory.title}
Content: ${memory.content.substring(0, 2000)}
Timestamp: ${memory.timestamp}

Look for:
- Explicit deadlines ("due by", "deadline", "by", "before")
- Dates mentioned in the content
- Time-sensitive items
- Meeting dates/times
- Payment due dates
- Submission deadlines

For each deadline found:
1. Extract the description
2. Extract the due date (convert to ISO format)
3. Calculate urgency:
   - high: due within 24 hours
   - medium: due within 7 days
   - low: due after 7 days

Current date: ${now.toISOString()}

Return JSON with array of deadlines. If no deadlines found, return empty array.`;

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
          return { success: true, data: { deadlines: [] } };
        }
      }

      const result = deadlineSchema.parse(parsed);

      const deadlines = result.deadlines.map((deadline) => {
        const dueDate = new Date(deadline.dueDate);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        let urgency: "high" | "medium" | "low" = deadline.urgency;

        if (hoursUntilDue < 0) {
          urgency = "high";
        } else if (hoursUntilDue < 24) {
          urgency = "high";
        } else if (hoursUntilDue < 168) {
          urgency = urgency === "low" ? "medium" : urgency;
        }

        return {
          text: deadline.text,
          dueDate: dueDate.toISOString(),
          urgency,
          memoryId: memory.id,
          source: memory.source,
        };
      });

      return {
        success: true,
        data: { deadlines },
      };
    } catch (error) {
      console.error("DeadlineAgent error:", error);
      return {
        success: true,
        data: { deadlines: [] },
      };
    }
  }
}
