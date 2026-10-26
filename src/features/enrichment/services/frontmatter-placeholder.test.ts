import { describe, expect, it } from "vitest";

import {
  DEFAULT_NONE_PLACEHOLDER,
  DEFAULT_GENERATED_PLACEHOLDER,
  DEFAULT_PENDING_PLACEHOLDER,
  DEFAULT_SUMMARY_FRONTMATTER_KEY,
  markSummaryPlaceholderAsGenerated,
  readSummaryPlaceholderState
} from "./frontmatter-placeholder";

describe("readSummaryPlaceholderState", () => {
  it("detects the pending placeholder in frontmatter", () => {
    const note = [
      "---",
      `title: Example`,
      `${DEFAULT_SUMMARY_FRONTMATTER_KEY}: ${DEFAULT_PENDING_PLACEHOLDER}`,
      "---",
      "",
      "Body"
    ].join("\n");

    expect(readSummaryPlaceholderState(note)).toEqual({
      hasFrontmatter: true,
      summaryFieldPresent: true,
      summaryFieldValue: "pending",
      status: "pending",
      isNone: false,
      isPending: true,
      isGenerated: false
    });
  });

  it("detects the none placeholder in frontmatter", () => {
    const note = [
      "---",
      `ai_summary: ${DEFAULT_NONE_PLACEHOLDER}`,
      "---",
      "",
      "Body"
    ].join("\n");

    expect(readSummaryPlaceholderState(note)).toEqual({
      hasFrontmatter: true,
      summaryFieldPresent: true,
      summaryFieldValue: "none",
      status: "none",
      isNone: true,
      isPending: false,
      isGenerated: false
    });
  });

  it("detects generated notes explicitly", () => {
    const note = [
      "---",
      `ai_summary: ${DEFAULT_GENERATED_PLACEHOLDER}`,
      "---",
      "",
      "Body"
    ].join("\n");

    expect(readSummaryPlaceholderState(note)).toEqual({
      hasFrontmatter: true,
      summaryFieldPresent: true,
      summaryFieldValue: "generated",
      status: "generated",
      isNone: false,
      isPending: false,
      isGenerated: true
    });
  });

  it("returns a negative state when the field is absent", () => {
    const note = ["---", "title: Example", "---", "", "Body"].join("\n");

    expect(readSummaryPlaceholderState(note)).toEqual({
      hasFrontmatter: true,
      summaryFieldPresent: false,
      summaryFieldValue: null,
      status: "missing",
      isNone: false,
      isPending: false,
      isGenerated: false
    });
  });
});

describe("explicit state helpers", () => {
  it("returns true only for the matching placeholder state", () => {
    const noneNote = ["---", "ai_summary: none", "---", "", "Body"].join("\n");
    const pendingNote = [
      "---",
      "ai_summary: pending",
      "---",
      "",
      "Body"
    ].join("\n");
    const generatedNote = [
      "---",
      "ai_summary: generated",
      "---",
      "",
      "Body"
    ].join("\n");

    expect(readSummaryPlaceholderState(noneNote).isNone).toBe(true);
    expect(readSummaryPlaceholderState(pendingNote).isNone).toBe(false);
    expect(readSummaryPlaceholderState(pendingNote).isPending).toBe(true);
    expect(readSummaryPlaceholderState(generatedNote).isPending).toBe(false);
    expect(readSummaryPlaceholderState(generatedNote).isGenerated).toBe(true);
    expect(readSummaryPlaceholderState(noneNote).isGenerated).toBe(false);
  });
});

describe("pending placeholder detection", () => {
  it("returns true only for pending notes", () => {
    const pendingNote = [
      "---",
      "ai_summary: pending",
      "---",
      "",
      "Body"
    ].join("\n");
    const generatedNote = [
      "---",
      "ai_summary: generated",
      "---",
      "",
      "Body"
    ].join("\n");

    expect(readSummaryPlaceholderState(pendingNote).isPending).toBe(true);
    expect(readSummaryPlaceholderState(generatedNote).isPending).toBe(false);
  });
});

describe("markSummaryPlaceholderAsGenerated", () => {
  it("updates pending notes to generated", () => {
    const note = ["---", "ai_summary: pending", "---", "", "Body"].join("\n");

    expect(markSummaryPlaceholderAsGenerated(note)).toBe(
      ["---", "ai_summary: generated", "---", "", "Body"].join("\n")
    );
  });

  it("leaves non-pending notes unchanged", () => {
    const note = ["---", "ai_summary: none", "---", "", "Body"].join("\n");

    expect(markSummaryPlaceholderAsGenerated(note)).toBe(note);
  });
});
