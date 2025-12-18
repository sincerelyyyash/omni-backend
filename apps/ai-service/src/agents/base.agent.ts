import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { CreateMemoryInput } from "@repo/types";

export interface EnrichmentResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export abstract class BaseAgent {
  protected llm: ChatGoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required");
    }

    this.llm = new ChatGoogleGenerativeAI({
      modelName: "gemini-pro",
      temperature: 0,
      apiKey,
    });
  }

  abstract process(memory: CreateMemoryInput & { id: number }): Promise<EnrichmentResult>;
}
