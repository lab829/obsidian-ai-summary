import { describe, expect, it } from "vitest";

import {
  normalizeProviderResponse,
  ProviderResponseFormatError
} from "./response-normalizer";

describe("normalizeProviderResponse", () => {
  it("converts valid provider text into the shared enrichment result shape", () => {
    const response = [
      "The author argues that disciplined daily study beats motivation. Consistent repetition builds understanding over time. Small steady effort compounds into confidence.",
      "",
      "- Spend one hour daily on DSA.",
      "- Reserve one hour for system design.",
      "- Explain concepts aloud in your own words."
    ].join("\n");

    expect(normalizeProviderResponse(response)).toEqual({
      summary:
        "The author argues that disciplined daily study beats motivation. Consistent repetition builds understanding over time. Small steady effort compounds into confidence.",
      takeaways: [
        "- Spend one hour daily on DSA.",
        "- Reserve one hour for system design.",
        "- Explain concepts aloud in your own words."
      ]
    });
  });

  it("preserves markdown bullets in the normalized takeaways", () => {
    const response = [
      "The author frames consistency as the core habit. Repetition is more reliable than bursts of motivation. Practice compounds over time.",
      "",
      "- Keep the work daily.",
      "* Explain what you learned.",
      "- Review notes in your own words."
    ].join("\n");

    expect(normalizeProviderResponse(response).takeaways).toEqual([
      "- Keep the work daily.",
      "* Explain what you learned.",
      "- Review notes in your own words."
    ]);
  });

  it("rejects malformed provider output that does not include 3 to 5 bullet takeaways", () => {
    const malformedResponse = [
      "The author makes a clear claim. It is supported with examples. The message is practical.",
      "",
      "- Only one takeaway."
    ].join("\n");

    expect(() => normalizeProviderResponse(malformedResponse)).toThrow(
      ProviderResponseFormatError
    );
  });

  it("rejects malformed provider output when the summary is not exactly three sentences", () => {
    const malformedResponse = [
      "The author makes a clear claim. It is supported with examples.",
      "",
      "- First takeaway.",
      "- Second takeaway.",
      "- Third takeaway."
    ].join("\n");

    expect(() => normalizeProviderResponse(malformedResponse)).toThrow(
      ProviderResponseFormatError
    );
  });
});
