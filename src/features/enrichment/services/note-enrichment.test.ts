import { describe, expect, it } from "vitest";

import { applyEnrichmentResultToNote } from "./note-enrichment";

const enrichmentResult = {
  summary:
    "The author argues for a disciplined daily study habit focused on technical fundamentals. Consistency matters more than motivation. Small repeated effort compounds into real confidence.",
  takeaways: [
    "Dedicate one hour to DSA practice daily.",
    "- Spend one hour on system design concepts.",
    "* Explain concepts out loud in your own words."
  ]
};

describe("applyEnrichmentResultToNote", () => {
  it("inserts the enrichment block after frontmatter and marks the note generated", () => {
    const note = [
      "---",
      "title: Example",
      "ai_summary: pending",
      "---",
      "",
      "# Source",
      "",
      "Original body"
    ].join("\n");

    expect(applyEnrichmentResultToNote(note, enrichmentResult)).toBe(
      [
        "---",
        "title: Example",
        "ai_summary: generated",
        "---",
        "",
        "> > The author argues for a disciplined daily study habit focused on technical fundamentals. Consistency matters more than motivation. Small repeated effort compounds into real confidence.",
        "",
        "**Key takeaways:**",
        "- Dedicate one hour to DSA practice daily.",
        "- Spend one hour on system design concepts.",
        "- Explain concepts out loud in your own words.",
        "",
        "# Source",
        "",
        "Original body"
      ].join("\n")
    );
  });

  it("preserves source content when the body starts immediately after frontmatter", () => {
    const note = [
      "---",
      "title: Example",
      "ai_summary: pending",
      "---",
      "Original body starts immediately"
    ].join("\n");

    expect(applyEnrichmentResultToNote(note, enrichmentResult)).toBe(
      [
        "---",
        "title: Example",
        "ai_summary: generated",
        "---",
        "",
        "> > The author argues for a disciplined daily study habit focused on technical fundamentals. Consistency matters more than motivation. Small repeated effort compounds into real confidence.",
        "",
        "**Key takeaways:**",
        "- Dedicate one hour to DSA practice daily.",
        "- Spend one hour on system design concepts.",
        "- Explain concepts out loud in your own words.",
        "",
        "Original body starts immediately"
      ].join("\n")
    );
  });

  it("does not duplicate the enrichment block for generated notes", () => {
    const note = [
      "---",
      "title: Example",
      "ai_summary: generated",
      "---",
      "",
      "> > Existing summary.",
      "",
      "**Key takeaways:**",
      "- Existing takeaway",
      "",
      "Original body"
    ].join("\n");

    expect(applyEnrichmentResultToNote(note, enrichmentResult)).toBe(note);
  });
});
