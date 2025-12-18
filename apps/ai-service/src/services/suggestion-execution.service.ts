import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { notificationService } from "./notification.service";
import { memoryClient } from "./memory-client.service";

export class SuggestionExecutionService {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }

    this.llm = new ChatGoogleGenerativeAI({
      modelName: "gemini-pro",
      temperature: 0.7,
      apiKey,
    });
  }

  async execute(
    userId: number,
    notificationId: string,
    suggestionId: string,
  ): Promise<Record<string, unknown>> {
    const notification = await notificationService.getNotification(notificationId);

    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found");
    }

    const suggestions = notification.suggestions as Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      action: string;
      context: Record<string, unknown>;
    }>;

    const suggestion = suggestions.find((s) => s.id === suggestionId);

    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    const memory = await memoryClient.getMemory(notification.memoryId);

    if (!memory) {
      throw new Error("Memory not found");
    }

    const relatedMemories = await this.gatherRelatedContext(
      userId,
      notification,
      suggestion,
      memory,
    );

    const result = await this.executeSuggestionDynamically(
      suggestion,
      memory,
      relatedMemories,
      notification,
    );

    return result;
  }

  private async gatherRelatedContext(
    userId: number,
    notification: { source: string; type: string },
    suggestion: { type: string; title: string; context: Record<string, unknown> },
    memory: { origin: string; content: string },
  ): Promise<Array<{ title: string; content: string; origin: string }>> {
    const prompt = `Determine what related context to gather for this suggestion:

Suggestion Type: ${suggestion.type}
Suggestion Title: ${suggestion.title}
Suggestion Context: ${JSON.stringify(suggestion.context, null, 2)}
Notification Source: ${notification.source}
Notification Type: ${notification.type}
Memory Origin: ${memory.origin}

Analyze what related memories or data would be helpful to gather. Consider:
- If suggestion involves people, gather memories about those people
- If suggestion involves emails/communication, gather related email threads
- If suggestion involves projects/tasks, gather related work items
- If suggestion involves financial data, gather related transactions
- If suggestion involves events, gather related calendar items

Return JSON with:
{
  "shouldGather": true/false,
  "searchQueries": ["query1", "query2"] - search terms to find related memories,
  "sources": ["gmail", "github", etc.] - which sources to search,
  "limit": number - how many results to fetch,
  "reasoning": "why this context is needed"
}

If no related context is needed, return shouldGather: false.`;

    const response = await this.llm.invoke(prompt);
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return [];
      }
    }

    const contextPlan = parsed as {
      shouldGather: boolean;
      searchQueries?: string[];
      sources?: string[];
      limit?: number;
      reasoning?: string;
    };

    if (!contextPlan.shouldGather || !contextPlan.searchQueries) {
      return [];
    }

    const relatedMemories: Array<{ title: string; content: string; origin: string }> = [];

    for (const query of contextPlan.searchQueries) {
      const memories = await memoryClient.searchMemories(userId, query, {
        source: contextPlan.sources?.[0],
        limit: contextPlan.limit || 10,
      });

      relatedMemories.push(
        ...memories.map((m) => ({
          title: m.title,
          content: m.summary,
          origin: m.origin,
        })),
      );
    }

    return relatedMemories;
  }

  private async executeSuggestionDynamically(
    suggestion: {
      type: string;
      title: string;
      description?: string;
      action: string;
      context: Record<string, unknown>;
    },
    memory: { title: string; content: string; origin: string; summary: string },
    relatedMemories: Array<{ title: string; content: string; origin: string }>,
    notification: { source: string; type: string; dueDate: Date | null },
  ): Promise<Record<string, unknown>> {
    const relatedContext = relatedMemories.length > 0
      ? `\n\nRelated memories:\n${relatedMemories
          .map((m, i) => `${i + 1}. ${m.title}\n   From: ${m.origin}\n   ${m.content.substring(0, 200)}`)
          .join("\n\n")}`
      : "";

    const prompt = `You are an AI assistant that executes user suggestions dynamically. Based on the suggestion below, generate the appropriate response.

Suggestion Type: ${suggestion.type}
Suggestion Title: ${suggestion.title}
Suggestion Description: ${suggestion.description || "None"}
Action: ${suggestion.action}

Notification Context:
- Source: ${notification.source}
- Type: ${notification.type}
- Due Date: ${notification.dueDate ? notification.dueDate.toISOString() : "None"}

Current Memory:
Title: ${memory.title}
Origin: ${memory.origin}
Content: ${memory.content.substring(0, 2000)}
Summary: ${memory.summary}${relatedContext}

Suggestion Context: ${JSON.stringify(suggestion.context, null, 2)}

Based on the suggestion type and context, execute the suggestion and return a structured result.

For gift-ideas: Return JSON array of gift suggestions: [{ "title": "...", "description": "...", "priceRange": "...", "reasoning": "..." }]
For email-summary: Return JSON: { "summary": "...", "keyPoints": [...], "actionItems": [...], "nextSteps": [...] }
For payment-reminder: Return JSON: { "reminderSet": true, "dueDate": "...", "message": "..." }
For review-checklist: Return JSON: { "checklist": [{ "category": "...", "items": ["..."] }] }
For meeting-prep: Return JSON: { "agenda": [...], "questions": [...], "documents": [...], "actionItems": [...], "context": "..." }
For custom: Analyze the suggestion and return appropriate JSON structure

Return ONLY valid JSON, no additional text.`;

    const response = await this.llm.invoke(prompt);
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse LLM response");
      }
    }

    return parsed as Record<string, unknown>;
  }
}

export const suggestionExecutionService = new SuggestionExecutionService();
