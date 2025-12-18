import { NotificationAgent } from "../agents/notification.agent";
import { ActionItemAgent } from "../agents/action-item.agent";
import { FinanceAgent } from "../agents/finance.agent";
import { DeadlineAgent } from "../agents/deadline.agent";
import { SuggestionAgent } from "../agents/suggestion.agent";
import { memoryClient } from "./memory-client.service";
import { notificationService } from "./notification.service";
import type { CreateMemoryInput } from "@repo/types";

export class EnrichmentService {
  private notificationAgent = new NotificationAgent();
  private actionItemAgent = new ActionItemAgent();
  private financeAgent = new FinanceAgent();
  private deadlineAgent = new DeadlineAgent();
  private suggestionAgent = new SuggestionAgent();

  async enrichMemory(memoryId: number, userId: number): Promise<void> {
    try {
      const memory = await memoryClient.getMemory(memoryId);

      if (!memory) {
        console.warn(`Memory ${memoryId} not found`);
        return;
      }

      const memoryWithId = {
        ...memory,
        id: memory.id,
        content: memory.content || memory.summary,
      } as CreateMemoryInput & { id: number };

      const [
        notificationResult,
        actionItemResult,
        financeResult,
        deadlineResult,
        suggestionResult,
      ] = await Promise.allSettled([
        this.notificationAgent.process(memoryWithId),
        this.actionItemAgent.process(memoryWithId),
        this.financeAgent.process(memoryWithId),
        this.deadlineAgent.process(memoryWithId),
        this.suggestionAgent.process(memoryWithId),
      ]);

      const notificationData = notificationResult.status === "fulfilled" && notificationResult.value.success
        ? notificationResult.value.data
        : null;

      const actionItems = actionItemResult.status === "fulfilled" && actionItemResult.value.success
        ? (actionItemResult.value.data?.items as unknown[]) || []
        : [];

      const financeData = financeResult.status === "fulfilled" && financeResult.value.success
        ? financeResult.value.data
        : null;

      const deadlines = deadlineResult.status === "fulfilled" && deadlineResult.value.success
        ? (deadlineResult.value.data?.deadlines as unknown[]) || []
        : [];

      const suggestions = suggestionResult.status === "fulfilled" && suggestionResult.value.success
        ? (suggestionResult.value.data?.suggestions as unknown[]) || []
        : [];

      if (!notificationData) {
        console.warn(`Failed to classify notification for memory ${memoryId}`);
        return;
      }

      const enrichedData: Record<string, unknown> = {};
      if (financeData) {
        enrichedData.finance = financeData;
      }
      if (actionItems.length > 0) {
        enrichedData.actionItems = actionItems;
      }
      if (deadlines.length > 0) {
        enrichedData.deadlines = deadlines;
      }

      await notificationService.createNotification({
        userId,
        memoryId,
        source: memory.source,
        type: notificationData.type as string,
        priority: notificationData.priority as string,
        requiresAction: notificationData.requiresAction as boolean,
        actionType: notificationData.actionType as string | null,
        actionUrl: memory.contentUrl,
        dueDate: notificationData.dueDate
          ? new Date(notificationData.dueDate as string)
          : null,
        enrichedData,
        suggestions: suggestions as unknown as Array<{
          id: string;
          type: string;
          title: string;
          description?: string;
          action: string;
          context: Record<string, unknown>;
          priority: string;
        }>,
      });

      console.log(`Enriched memory ${memoryId} for user ${userId}`);
    } catch (error) {
      console.error(`Error enriching memory ${memoryId}:`, error);
      throw error;
    }
  }
}

export const enrichmentService = new EnrichmentService();
