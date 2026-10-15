export const DEFAULT_SUMMARY_FRONTMATTER_KEY = "ai_summary";
export const DEFAULT_NONE_PLACEHOLDER = "none";
export const DEFAULT_PENDING_PLACEHOLDER = "pending";
export const DEFAULT_GENERATED_PLACEHOLDER = "generated";

export type SummaryPlaceholderStatus =
  | "missing"
  | "none"
  | "pending"
  | "generated"
  | "other";

export interface SummaryPlaceholderState {
  hasFrontmatter: boolean;
  summaryFieldPresent: boolean;
  summaryFieldValue: string | null;
  status: SummaryPlaceholderStatus;
  isNone: boolean;
  isPending: boolean;
  isGenerated: boolean;
}

const FRONTMATTER_BLOCK_PATTERN = /^---\n([\s\S]*?)\n---/;

export function readSummaryPlaceholderState(
  noteContent: string,
  frontmatterKey = DEFAULT_SUMMARY_FRONTMATTER_KEY,
  noneValue = DEFAULT_NONE_PLACEHOLDER,
  pendingValue = DEFAULT_PENDING_PLACEHOLDER,
  generatedValue = DEFAULT_GENERATED_PLACEHOLDER
): SummaryPlaceholderState {
  const frontmatterMatch = noteContent.match(FRONTMATTER_BLOCK_PATTERN);

  if (!frontmatterMatch) {
    return {
      hasFrontmatter: false,
      summaryFieldPresent: false,
      summaryFieldValue: null,
      status: "missing",
      isNone: false,
      isPending: false,
      isGenerated: false
    };
  }

  const frontmatter = frontmatterMatch[1] ?? "";
  const escapedKey = escapeForRegularExpression(frontmatterKey);
  const fieldPattern = new RegExp(`^${escapedKey}:\\s*(.+)$`, "m");
  const fieldMatch = frontmatter.match(fieldPattern);

  if (!fieldMatch) {
    return {
      hasFrontmatter: true,
      summaryFieldPresent: false,
      summaryFieldValue: null,
      status: "missing",
      isNone: false,
      isPending: false,
      isGenerated: false
    };
  }

  const rawValue = (fieldMatch[1] ?? "").trim();
  const normalizedValue = normalizeYamlScalar(rawValue);
  const isNone = normalizedValue === noneValue;
  const isPending = normalizedValue === pendingValue;
  const isGenerated = normalizedValue === generatedValue;
  const status = isNone
    ? "none"
    : isPending
      ? "pending"
      : isGenerated
        ? "generated"
        : "other";

  return {
    hasFrontmatter: true,
    summaryFieldPresent: true,
    summaryFieldValue: normalizedValue,
    status,
    isNone,
    isPending,
    isGenerated
  };
}

export function hasNoneSummaryPlaceholder(
  noteContent: string,
  frontmatterKey = DEFAULT_SUMMARY_FRONTMATTER_KEY,
  noneValue = DEFAULT_NONE_PLACEHOLDER
): boolean {
  return readSummaryPlaceholderState(
    noteContent,
    frontmatterKey,
    noneValue
  ).isNone;
}

export function hasPendingSummaryPlaceholder(
  noteContent: string,
  frontmatterKey = DEFAULT_SUMMARY_FRONTMATTER_KEY,
  noneValue = DEFAULT_NONE_PLACEHOLDER,
  pendingValue = DEFAULT_PENDING_PLACEHOLDER
): boolean {
  return readSummaryPlaceholderState(
    noteContent,
    frontmatterKey,
    noneValue,
    pendingValue
  ).isPending;
}

export function hasGeneratedSummaryPlaceholder(
  noteContent: string,
  frontmatterKey = DEFAULT_SUMMARY_FRONTMATTER_KEY,
  noneValue = DEFAULT_NONE_PLACEHOLDER,
  pendingValue = DEFAULT_PENDING_PLACEHOLDER,
  generatedValue = DEFAULT_GENERATED_PLACEHOLDER
): boolean {
  return readSummaryPlaceholderState(
    noteContent,
    frontmatterKey,
    noneValue,
    pendingValue,
    generatedValue
  ).isGenerated;
}

export function markSummaryPlaceholderAsGenerated(
  noteContent: string,
  frontmatterKey = DEFAULT_SUMMARY_FRONTMATTER_KEY,
  noneValue = DEFAULT_NONE_PLACEHOLDER,
  pendingValue = DEFAULT_PENDING_PLACEHOLDER,
  generatedValue = DEFAULT_GENERATED_PLACEHOLDER
): string {
  const placeholderState = readSummaryPlaceholderState(
    noteContent,
    frontmatterKey,
    noneValue,
    pendingValue,
    generatedValue
  );

  if (!placeholderState.isPending) {
    return noteContent;
  }

  const escapedKey = escapeForRegularExpression(frontmatterKey);
  const fieldPattern = new RegExp(`(^${escapedKey}:\\s*)(.+)$`, "m");

  return noteContent.replace(fieldPattern, `$1${generatedValue}`);
}

function normalizeYamlScalar(value: string): string {
  const wrappedInDoubleQuotes = value.startsWith("\"") && value.endsWith("\"");
  const wrappedInSingleQuotes = value.startsWith("'") && value.endsWith("'");

  if (wrappedInDoubleQuotes || wrappedInSingleQuotes) {
    return value.slice(1, -1).trim();
  }

  return value;
}

function escapeForRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
