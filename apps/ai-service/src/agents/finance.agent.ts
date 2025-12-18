import { z } from "zod";
import { BaseAgent, type EnrichmentResult } from "./base.agent";
import type { CreateMemoryInput } from "@repo/types";

const financeDataSchema = z.object({
  amount: z.number().nullable().describe("Amount in the transaction"),
  currency: z.string().nullable().describe("Currency code (USD, EUR, INR, etc.) - infer from content, do not default"),
  merchant: z.string().nullable().describe("Merchant, vendor, or service provider name"),
  date: z.string().nullable().describe("Transaction date in ISO format"),
  type: z.string().nullable().describe("Type: receipt, bill, subscription, payment, refund, etc."),
  dueDate: z.string().nullable().describe("Due date in ISO format if applicable"),
  category: z.string().nullable().describe("Expense category: food, travel, utilities, shopping, entertainment, etc."),
  paymentMethod: z.string().nullable().describe("Payment method: card, UPI, NEFT, bank transfer, Cred app, Paytm, etc."),
  transactionId: z.string().nullable().describe("Transaction ID or reference number if mentioned"),
  bankName: z.string().nullable().describe("Bank name if mentioned"),
  accountLast4: z.string().nullable().describe("Last 4 digits of account/card if mentioned"),
});

export class FinanceAgent extends BaseAgent {
  async process(
    memory: CreateMemoryInput & { id: number },
  ): Promise<EnrichmentResult> {
    try {
      const prompt = `Analyze this ${memory.source} content and extract any financial information:

Title: ${memory.title}
Content: ${memory.content.substring(0, 2000)}
Source: ${memory.source}
Timestamp: ${memory.timestamp}

Extract ALL financial information including:
1. Amount and currency (infer currency from symbols, text, or context - do NOT default to USD)
2. Merchant/vendor/service provider name
3. Transaction date
4. Type: receipt, bill, subscription, payment, refund, transfer, etc.
5. Due date if mentioned
6. Expense category (food, travel, utilities, shopping, entertainment, healthcare, etc.)
7. Payment method: card (credit/debit), UPI (PhonePe, Google Pay, Paytm), NEFT, RTGS, IMPS, bank transfer, Cred app, Razorpay, Stripe, etc.
8. Transaction ID or reference number
9. Bank name if mentioned
10. Last 4 digits of account/card if mentioned

Look for various payment patterns:
- Card payments: "paid via card", "card ending in", "Visa/Mastercard"
- UPI: "UPI", "PhonePe", "Google Pay", "Paytm", "BHIM", UPI IDs
- Bank transfers: "NEFT", "RTGS", "IMPS", "bank transfer", "transferred to"
- Apps: "Cred", "Razorpay", "Stripe", "Paytm", "PhonePe"
- Currency indicators: ₹, $, €, £, INR, USD, EUR, GBP, etc.

If NO financial information is found in the content, return null.
If financial information exists, return JSON with all extracted fields.`;

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
          return { success: true, data: null };
        }
      }

      const result = financeDataSchema.parse(parsed);

      if (!result.amount && !result.merchant && !result.transactionId) {
        return { success: true, data: null };
      }

      return {
        success: true,
        data: {
          amount: result.amount,
          currency: result.currency,
          merchant: result.merchant,
          date: result.date ? new Date(result.date).toISOString() : null,
          type: result.type,
          dueDate: result.dueDate ? new Date(result.dueDate).toISOString() : null,
          category: result.category,
          paymentMethod: result.paymentMethod,
          transactionId: result.transactionId,
          bankName: result.bankName,
          accountLast4: result.accountLast4,
        },
      };
    } catch (error) {
      console.error("FinanceAgent error:", error);
      return {
        success: true,
        data: null,
      };
    }
  }
}
