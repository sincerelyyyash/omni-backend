import { z } from "zod";

export const suggestionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "gift-ideas",
    "email-summary",
    "payment-reminder",
    "review-checklist",
    "meeting-prep",
    "custom",
  ]),
  title: z.string(),
  description: z.string().optional(),
  action: z.string(),
  context: z.record(z.unknown()),
  priority: z.enum(["high", "medium", "low"]),
});

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.number(),
  memoryId: z.number(),
  source: z.string(),
  type: z.string(),
  priority: z.string(),
  status: z.string(),
  requiresAction: z.boolean(),
  actionType: z.string().nullable(),
  actionUrl: z.string().nullable(),
  dueDate: z.date().nullable(),
  enrichedData: z.record(z.unknown()),
  suggestions: z.array(suggestionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  readAt: z.date().nullable(),
});

export const notificationFiltersSchema = z.object({
  source: z.enum(["gmail", "github", "twitter", "calendar", "all"]).optional(),
  status: z.enum(["unread", "read", "archived", "all"]).optional(),
  priority: z.enum(["high", "medium", "low", "all"]).optional(),
  requiresAction: z.boolean().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const enrichmentResultSchema = z.object({
  notification: notificationSchema.partial(),
  actionItems: z.array(z.any()).optional(),
  financeData: z.record(z.unknown()).optional(),
  deadlines: z.array(z.any()).optional(),
  suggestions: z.array(suggestionSchema).optional(),
});

export const actionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
  memoryId: z.number(),
  dueDate: z.date().nullable(),
  priority: z.enum(["high", "medium", "low"]),
  completed: z.boolean(),
});

export const financeDataSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  merchant: z.string().optional(),
  date: z.date().optional(),
  type: z.enum(["receipt", "bill", "subscription", "payment"]).optional(),
  dueDate: z.date().nullable(),
  category: z.string().optional(),
});

export const suggestionExecutionRequestSchema = z.object({
  notificationId: z.string(),
  suggestionId: z.string(),
  userId: z.number(),
});

export const suggestionExecutionResultSchema = z.object({
  success: z.boolean(),
  result: z.record(z.unknown()),
  error: z.string().optional(),
});

export type Suggestion = z.infer<typeof suggestionSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationFilters = z.infer<typeof notificationFiltersSchema>;
export type EnrichmentResult = z.infer<typeof enrichmentResultSchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
export type FinanceData = z.infer<typeof financeDataSchema>;
export type SuggestionExecutionRequest = z.infer<
  typeof suggestionExecutionRequestSchema
>;
export type SuggestionExecutionResult = z.infer<
  typeof suggestionExecutionResultSchema
>;
