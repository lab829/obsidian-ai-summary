import { describe, expect, it, vi } from "vitest";

import type { EnrichmentResult } from "../types/enrichment-result";
import { processPendingNote } from "./process-pending-note";
import {
  SUMMARY_PROMPT,
  TAKEAWAYS_PROMPT
} from "./prompt-contract";

const enrichmentResult: EnrichmentResult = {
  summary:
    "The page argues that deliberate repetition matters more than raw intensity. Small daily study sessions build durable technical confidence. Consistency is the actual advantage.",
  takeaways: [
    "- Study every day.",
    "- Split time between fundamentals and explanation.",
    "- Keep the workflow simple."
  ]
};

const pendingNote = [
  "---",
  "title: Example",
  "ai_summary: pending",
  "---",
  "",
  "# Source",
  "",
  "Original body"
].join("\n");

const noneNote = [
  "---",
  "title: Example",
  "ai_summary: none",
  "---",
  "",
  "# Source",
  "",
  "Original body"
].join("\n");

const defaultRuntimeSettings = {
  provider: "gemini" as const,
  apiKey: "gemini-key",
  model: "gemini-2.5-flash",
  summaryPrompt: SUMMARY_PROMPT,
  takeawaysPrompt: TAKEAWAYS_PROMPT,
  summaryFrontmatterKey: "ai_summary" as const,
  pendingPlaceholderValue: "pending" as const
};

describe("processPendingNote", () => {
  it("processes pending notes and writes the generated result back to the note", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(pendingNote);
    const writeNoteContent = vi.fn().mockResolvedValue(undefined);
    const summarize = vi.fn().mockResolvedValue(enrichmentResult);
    const createProviderAdapter = vi.fn().mockReturnValue({
      provider: "gemini",
      summarize
    });

    const result = await processPendingNote(
      "Clips/example.md",
      defaultRuntimeSettings,
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toEqual({
      status: "processed",
      filePath: "Clips/example.md",
      enrichmentResult
    });
    expect(createProviderAdapter).toHaveBeenCalledWith({
      provider: "gemini",
      apiKey: "gemini-key"
    });
    expect(summarize).toHaveBeenCalledWith({
      model: "gemini-2.5-flash",
      noteBody: "# Source\n\nOriginal body",
      promptContract: {
        noteBody: "# Source\n\nOriginal body",
        summaryPrompt:
          "In exactly 3 sentences, state the main thesis or finding of this page. No preamble.",
        takeawaysPrompt:
          "Return 3-5 markdown bullet lines (- item) with the most actionable insights from this page."
      }
    });
    expect(writeNoteContent).toHaveBeenCalledWith(
      "Clips/example.md",
      [
        "---",
        "title: Example",
        "ai_summary: generated",
        "---",
        "",
        "> > The page argues that deliberate repetition matters more than raw intensity. Small daily study sessions build durable technical confidence. Consistency is the actual advantage.",
        "",
        "**Key takeaways:**",
        "- Study every day.",
        "- Split time between fundamentals and explanation.",
        "- Keep the workflow simple.",
        "",
        "# Source",
        "",
        "Original body"
      ].join("\n")
    );
  });

  it("skips notes that are already generated", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(
      pendingNote.replace("ai_summary: pending", "ai_summary: generated")
    );
    const writeNoteContent = vi.fn();
    const createProviderAdapter = vi.fn();

    const result = await processPendingNote(
      "Clips/generated.md",
      defaultRuntimeSettings,
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toEqual({
      status: "skipped",
      code: "already-generated",
      filePath: "Clips/generated.md"
    });
    expect(createProviderAdapter).not.toHaveBeenCalled();
    expect(writeNoteContent).not.toHaveBeenCalled();
  });

  it("skips notes that are explicitly marked none", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(noneNote);
    const writeNoteContent = vi.fn();
    const createProviderAdapter = vi.fn();

    const result = await processPendingNote(
      "Clips/none.md",
      defaultRuntimeSettings,
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toEqual({
      status: "skipped",
      code: "none",
      filePath: "Clips/none.md"
    });
    expect(createProviderAdapter).not.toHaveBeenCalled();
    expect(writeNoteContent).not.toHaveBeenCalled();
  });

  it("skips notes that are not pending", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(
      pendingNote.replace("ai_summary: pending", "status: saved")
    );
    const writeNoteContent = vi.fn();
    const createProviderAdapter = vi.fn();

    const result = await processPendingNote(
      "Clips/regular.md",
      defaultRuntimeSettings,
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toEqual({
      status: "skipped",
      code: "not-pending",
      filePath: "Clips/regular.md"
    });
    expect(createProviderAdapter).not.toHaveBeenCalled();
    expect(writeNoteContent).not.toHaveBeenCalled();
  });

  it("replaces the previous enrichment block when a generated note is manually changed back to pending", async () => {
    const noteChangedBackToPending = [
      "---",
      "title: Example",
      "ai_summary: pending",
      "---",
      "",
      "> > Existing summary.",
      "",
      "**Key takeaways:**",
      "- Existing takeaway",
      "",
      "# Source",
      "",
      "Original body"
    ].join("\n");
    const readNoteContent = vi.fn().mockResolvedValue(noteChangedBackToPending);
    const writeNoteContent = vi.fn().mockResolvedValue(undefined);
    const summarize = vi.fn().mockResolvedValue(enrichmentResult);
    const createProviderAdapter = vi.fn().mockReturnValue({
      provider: "gemini",
      summarize
    });

    const result = await processPendingNote(
      "Clips/reprocess.md",
      defaultRuntimeSettings,
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toEqual({
      status: "processed",
      filePath: "Clips/reprocess.md",
      enrichmentResult
    });
    expect(summarize).toHaveBeenCalledWith({
      model: "gemini-2.5-flash",
      noteBody: "# Source\n\nOriginal body",
      promptContract: {
        noteBody: "# Source\n\nOriginal body",
        summaryPrompt:
          "In exactly 3 sentences, state the main thesis or finding of this page. No preamble.",
        takeawaysPrompt:
          "Return 3-5 markdown bullet lines (- item) with the most actionable insights from this page."
      }
    });
    expect(writeNoteContent).toHaveBeenCalledWith(
      "Clips/reprocess.md",
      [
        "---",
        "title: Example",
        "ai_summary: generated",
        "---",
        "",
        "> > The page argues that deliberate repetition matters more than raw intensity. Small daily study sessions build durable technical confidence. Consistency is the actual advantage.",
        "",
        "**Key takeaways:**",
        "- Study every day.",
        "- Split time between fundamentals and explanation.",
        "- Keep the workflow simple.",
        "",
        "# Source",
        "",
        "Original body"
      ].join("\n")
    );
  });

  it("fails before provider execution when runtime settings are invalid", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(pendingNote);
    const writeNoteContent = vi.fn();
    const createProviderAdapter = vi.fn();

    const result = await processPendingNote(
      "Clips/invalid-settings.md",
      {
        provider: "openai",
        apiKey: "",
        model: "",
        summaryPrompt: SUMMARY_PROMPT,
        takeawaysPrompt: TAKEAWAYS_PROMPT,
        summaryFrontmatterKey: "ai_summary",
        pendingPlaceholderValue: "pending"
      },
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toMatchObject({
      status: "failed",
      code: "invalid-settings",
      filePath: "Clips/invalid-settings.md",
      message: "Add an API key before processing notes."
    });
    expect(createProviderAdapter).not.toHaveBeenCalled();
    expect(writeNoteContent).not.toHaveBeenCalled();
  });

  it("returns a provider failure and does not write the note", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(pendingNote);
    const writeNoteContent = vi.fn();
    const createProviderAdapter = vi.fn().mockReturnValue({
      provider: "openai",
      summarize: vi.fn().mockRejectedValue(new Error("rate limit"))
    });

    const result = await processPendingNote(
      "Clips/provider-failure.md",
      {
        provider: "openai",
        apiKey: "openai-key",
        model: "gpt-4.1-mini",
        summaryPrompt: SUMMARY_PROMPT,
        takeawaysPrompt: TAKEAWAYS_PROMPT,
        summaryFrontmatterKey: "ai_summary",
        pendingPlaceholderValue: "pending"
      },
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toMatchObject({
      status: "failed",
      code: "provider-failed",
      filePath: "Clips/provider-failure.md",
      message: "AI summary failed with the configured OpenAI provider."
    });
    expect(writeNoteContent).not.toHaveBeenCalled();
  });

  it("passes configured prompt text into the provider job without touching provider adapters", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(pendingNote);
    const writeNoteContent = vi.fn().mockResolvedValue(undefined);
    const summarize = vi.fn().mockResolvedValue(enrichmentResult);
    const createProviderAdapter = vi.fn().mockReturnValue({
      provider: "gemini",
      summarize
    });

    await processPendingNote(
      "Clips/custom-prompts.md",
      {
        ...defaultRuntimeSettings,
        summaryPrompt: "Write a single decisive sentence for a founder.",
        takeawaysPrompt: "Return exactly 3 markdown bullets focused on action items."
      },
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(summarize).toHaveBeenCalledWith({
      model: "gemini-2.5-flash",
      noteBody: "# Source\n\nOriginal body",
      promptContract: {
        noteBody: "# Source\n\nOriginal body",
        summaryPrompt: "Write a single decisive sentence for a founder.",
        takeawaysPrompt: "Return exactly 3 markdown bullets focused on action items."
      }
    });
  });

  it("returns a write failure when the note update cannot be persisted", async () => {
    const readNoteContent = vi.fn().mockResolvedValue(pendingNote);
    const writeNoteContent = vi
      .fn()
      .mockRejectedValue(new Error("vault modify failed"));
    const createProviderAdapter = vi.fn().mockReturnValue({
      provider: "gemini",
      summarize: vi.fn().mockResolvedValue(enrichmentResult)
    });

    const result = await processPendingNote(
      "Clips/write-failure.md",
      defaultRuntimeSettings,
      {
        readNoteContent,
        writeNoteContent,
        createProviderAdapter
      }
    );

    expect(result).toMatchObject({
      status: "failed",
      code: "write-failed",
      filePath: "Clips/write-failure.md",
      message: "AI summary was generated, but the note could not be updated."
    });
  });
});
