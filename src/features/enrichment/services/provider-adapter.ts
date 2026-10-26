import type { SummaryProvider } from "../../settings/services/plugin-settings";
import type { EnrichmentResult } from "../types/enrichment-result";
import type { SummaryJob } from "../types/summary-job";
import type { PromptContract } from "./prompt-contract";

export interface ProviderRequest {
  model: string;
  noteBody: string;
  promptContract: PromptContract;
}

export interface ProviderAdapter {
  readonly provider: SummaryProvider;
  summarize(request: ProviderRequest): Promise<EnrichmentResult>;
}

export function buildProviderPrompt(request: ProviderRequest): string {
  return [
    request.promptContract.summaryPrompt,
    request.promptContract.takeawaysPrompt,
    "Page content:",
    request.promptContract.noteBody
  ].join("\n\n");
}

export function buildProviderRequest(summaryJob: SummaryJob): ProviderRequest {
  return {
    model: summaryJob.model,
    noteBody: summaryJob.noteBody,
    promptContract: summaryJob.promptContract
  };
}
