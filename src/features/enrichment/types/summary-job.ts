import type { PromptContract } from "../services/prompt-contract";

export interface SummaryJob {
  filePath: string;
  provider: "gemini" | "openai";
  model: string;
  noteBody: string;
  promptContract: PromptContract;
}
