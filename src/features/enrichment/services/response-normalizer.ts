import type { EnrichmentResult } from "../types/enrichment-result";

const BULLET_LINE_PATTERN = /^[-*]\s+/;
const SENTENCE_PATTERN = /[^.!?]+[.!?]+(?:\s|$)/g;

export class ProviderResponseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderResponseFormatError";
  }
}

export function normalizeProviderResponse(rawText: string): EnrichmentResult {
  const trimmedResponse = rawText.trim();
  const lines = trimmedResponse
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstBulletIndex = lines.findIndex((line) => BULLET_LINE_PATTERN.test(line));

  if (firstBulletIndex <= 0) {
    throw new ProviderResponseFormatError(
      "Provider output must contain a summary followed by 3 to 5 markdown bullet takeaways."
    );
  }

  const summary = lines.slice(0, firstBulletIndex).join(" ").trim();
  const takeaways = lines.slice(firstBulletIndex);

  if (countSentences(summary) !== 3) {
    throw new ProviderResponseFormatError(
      "Provider summary must contain exactly three sentences."
    );
  }

  if (takeaways.length < 3 || takeaways.length > 5) {
    throw new ProviderResponseFormatError(
      "Provider takeaways must contain 3 to 5 markdown bullet lines."
    );
  }

  if (!takeaways.every((takeaway) => BULLET_LINE_PATTERN.test(takeaway))) {
    throw new ProviderResponseFormatError(
      "Provider takeaways must be markdown bullet lines."
    );
  }

  return {
    summary,
    takeaways
  };
}

function countSentences(value: string): number {
  return value.match(SENTENCE_PATTERN)?.length ?? 0;
}
