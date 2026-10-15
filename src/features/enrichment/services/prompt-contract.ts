export const SUMMARY_PROMPT =
  "In exactly 3 sentences, state the main thesis or finding of this page. No preamble.";

export const TAKEAWAYS_PROMPT =
  "Return 3-5 markdown bullet lines (- item) with the most actionable insights from this page.";

export interface PromptContract {
  noteBody: string;
  summaryPrompt: string;
  takeawaysPrompt: string;
}

export interface PromptContractOverrides {
  summaryPrompt?: string;
  takeawaysPrompt?: string;
}

export function createPromptContract(
  noteBody: string,
  overrides: PromptContractOverrides = {}
): PromptContract {
  return {
    noteBody: noteBody.trim(),
    summaryPrompt: resolvePromptInstruction(overrides.summaryPrompt, SUMMARY_PROMPT),
    takeawaysPrompt: resolvePromptInstruction(
      overrides.takeawaysPrompt,
      TAKEAWAYS_PROMPT
    )
  };
}

function resolvePromptInstruction(value: string | undefined, fallback: string): string {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : fallback;
}
