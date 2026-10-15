import { describe, expect, it } from "vitest";

import {
  SUMMARY_PROMPT,
  TAKEAWAYS_PROMPT,
  createPromptContract
} from "./prompt-contract";

describe("createPromptContract", () => {
  it("encodes the exact approved summary and takeaway instructions", () => {
    const promptContract = createPromptContract("  Source note body  ");

    expect(promptContract).toEqual({
      noteBody: "Source note body",
      summaryPrompt: SUMMARY_PROMPT,
      takeawaysPrompt: TAKEAWAYS_PROMPT
    });
  });

  it("allows configured prompt text to override the defaults", () => {
    const promptContract = createPromptContract("  Source note body  ", {
      summaryPrompt: "Write one sentence for a busy executive.",
      takeawaysPrompt: "Return exactly 2 concise markdown bullets."
    });

    expect(promptContract).toEqual({
      noteBody: "Source note body",
      summaryPrompt: "Write one sentence for a busy executive.",
      takeawaysPrompt: "Return exactly 2 concise markdown bullets."
    });
  });

  it("falls back to the defaults when configured prompt text is blank", () => {
    const promptContract = createPromptContract("Source note body", {
      summaryPrompt: "   ",
      takeawaysPrompt: ""
    });

    expect(promptContract).toEqual({
      noteBody: "Source note body",
      summaryPrompt: SUMMARY_PROMPT,
      takeawaysPrompt: TAKEAWAYS_PROMPT
    });
  });
});

describe("prompt constants", () => {
  it("locks the summary prompt wording exactly", () => {
    expect(SUMMARY_PROMPT).toBe(
      "In exactly 3 sentences, state the main thesis or finding of this page. No preamble."
    );
  });

  it("locks the takeaway prompt wording exactly", () => {
    expect(TAKEAWAYS_PROMPT).toBe(
      "Return 3-5 markdown bullet lines (- item) with the most actionable insights from this page."
    );
  });
});
