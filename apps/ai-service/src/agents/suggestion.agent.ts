import { z } from "zod";
import { BaseAgent, type EnrichmentResult } from "./base.agent";
import type { CreateMemoryInput } from "@repo/types";

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.string().describe("Suggestion type identifier - be creative and specific based on context"),
      title: z.string().describe("Natural language suggestion title"),
      description: z.string().optional().describe("Optional detailed description"),
      action: z.string().describe("Action identifier - unique identifier for executing this suggestion"),
      context: z.record(z.unknown()).describe("Additional context (person name, participants, dates, etc.)"),
      priority: z.enum(["high", "medium", "low"]).describe("Suggestion priority"),
    }),
  ),
});

export class SuggestionAgent extends BaseAgent {
  async process(
    memory: CreateMemoryInput & { id: number },
  ): Promise<EnrichmentResult> {
    try {
      const prompt = `Analyze this ${memory.source} notification and generate contextual, actionable suggestions:

Title: ${memory.title}
Content: ${memory.content.substring(0, 2000)}
Source: ${memory.source}
Type: ${memory.type}
Timestamp: ${memory.timestamp}
Categories: ${memory.category?.join(", ") || "none"}

Generate relevant suggestions based on the notification type and content. Examples:

Calendar Events:
- Birthday event → "Would you like me to suggest birthday gift ideas for [person]?" (type: gift-ideas)
- Meeting with participants → "Would you like a summary of emails between you and [participants]?" (type: email-summary)
- Upcoming deadline → "Would you like me to create a task breakdown for this?" (type: meeting-prep)

Email:
- Important thread → "Would you like a summary of this email thread?" (type: email-summary)
- Action required → "Would you like me to set a reminder to follow up?" (type: payment-reminder)

GitHub:
- PR review needed → "Would you like a review checklist for this PR?" (type: review-checklist)
- Issue assignment → "Would you like a task breakdown for this issue?" (type: meeting-prep)

Finance:
- Bill due soon → "Would you like me to set a payment reminder?" (type: payment-reminder)
- Subscription renewal → "Would you like a cost analysis for this subscription?" (type: custom)

Generate 1-3 relevant suggestions. Each suggestion should:
- Be natural and conversational
- Be actionable (user can execute it)
- Include relevant context (person names, dates, etc.)
- Have appropriate priority

Return JSON with array of suggestions. If no relevant suggestions, return empty array.`;

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
          return { success: true, data: { suggestions: [] } };
        }
      }

      const result = suggestionSchema.parse(parsed);

      const suggestions = result.suggestions.map((suggestion, index) => ({
        id: `${memory.id}-suggestion-${index}`,
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        action: suggestion.action,
        context: suggestion.context,
        priority: suggestion.priority,
      }));

      return {
        success: true,
        data: { suggestions },
      };
    } catch (error) {
      console.error("SuggestionAgent error:", error);
      return {
        success: true,
        data: { suggestions: [] },
      };
    }
  }
}
