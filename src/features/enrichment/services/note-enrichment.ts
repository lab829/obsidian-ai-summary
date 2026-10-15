import type { EnrichmentResult } from "../types/enrichment-result";
import {
  markSummaryPlaceholderAsGenerated,
  readSummaryPlaceholderState
} from "./frontmatter-placeholder";

const FRONTMATTER_WITH_BODY_PATTERN = /^(---\n[\s\S]*?\n---)(\n?)([\s\S]*)$/;

export function applyEnrichmentResultToNote(
  noteContent: string,
  enrichmentResult: EnrichmentResult
): string {
  const placeholderState = readSummaryPlaceholderState(noteContent);

  if (!placeholderState.isPending) {
    return noteContent;
  }

  const noteWithGeneratedState = markSummaryPlaceholderAsGenerated(noteContent);
  const frontmatterParts = splitFrontmatterAndBody(noteWithGeneratedState);

  if (!frontmatterParts) {
    return noteContent;
  }

  const bodyContent = removeLeadingBodySeparator(frontmatterParts.body);
  const enrichmentBlock = formatEnrichmentBlock(enrichmentResult);

  return [
    frontmatterParts.frontmatter,
    "",
    enrichmentBlock,
    ...(bodyContent ? ["", bodyContent] : [])
  ].join("\n");
}

function splitFrontmatterAndBody(
  noteContent: string
): { frontmatter: string; body: string } | null {
  const match = noteContent.match(FRONTMATTER_WITH_BODY_PATTERN);

  const frontmatter = match?.[1];

  if (!frontmatter) {
    return null;
  }

  return {
    frontmatter,
    body: match[3] ?? ""
  };
}

function formatEnrichmentBlock(enrichmentResult: EnrichmentResult): string {
  const takeawayLines = enrichmentResult.takeaways
    .map((takeaway) => `- ${normalizeTakeaway(takeaway)}`)
    .join("\n");

  return [
    `> > ${enrichmentResult.summary.trim()}`,
    "",
    "**Key takeaways:**",
    takeawayLines
  ].join("\n");
}

function normalizeTakeaway(takeaway: string): string {
  return takeaway.trim().replace(/^[-*]\s*/, "");
}

function removeLeadingBodySeparator(body: string): string {
  return body.startsWith("\n") ? body.slice(1) : body;
}
