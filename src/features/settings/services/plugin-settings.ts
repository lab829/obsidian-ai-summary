import {
  SUMMARY_PROMPT,
  TAKEAWAYS_PROMPT
} from "../../enrichment/services/prompt-contract";

export type SummaryProvider = "gemini" | "openai";

export const LOCKED_SUMMARY_FRONTMATTER_KEY = "ai_summary";
export const LOCKED_PENDING_SUMMARY_VALUE = "pending";
export const LOCKED_GENERATED_SUMMARY_VALUE = "generated";

interface EditableAiSummaryPluginSettings {
  provider: SummaryProvider;
  apiKey: string;
  model: string;
  summaryPrompt: string;
  takeawaysPrompt: string;
  autoProcessNewNotes: boolean;
  processingDebounceMs: number;
}

interface LockedAiSummaryContract {
  readonly summaryFrontmatterKey: typeof LOCKED_SUMMARY_FRONTMATTER_KEY;
  readonly pendingPlaceholderValue: typeof LOCKED_PENDING_SUMMARY_VALUE;
}

export type AiSummaryPluginSettings = EditableAiSummaryPluginSettings &
  LockedAiSummaryContract;

export const DEFAULT_SETTINGS: AiSummaryPluginSettings = {
  provider: "gemini",
  apiKey: "",
  model: "",
  summaryPrompt: SUMMARY_PROMPT,
  takeawaysPrompt: TAKEAWAYS_PROMPT,
  summaryFrontmatterKey: LOCKED_SUMMARY_FRONTMATTER_KEY,
  pendingPlaceholderValue: LOCKED_PENDING_SUMMARY_VALUE,
  autoProcessNewNotes: true,
  processingDebounceMs: 1500
};
