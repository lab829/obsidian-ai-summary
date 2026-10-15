import type { AiSummaryPluginSettings } from "../../settings/services/plugin-settings";
import type { SettingsValidationFailure } from "../../settings/services/settings-validation";
import { validateRuntimeSettings } from "../../settings/services/settings-validation";
import type { EnrichmentResult } from "../types/enrichment-result";
import type { SummaryJob } from "../types/summary-job";
import { applyEnrichmentResultToNote } from "./note-enrichment";
import { createPromptContract } from "./prompt-contract";
import type { ProviderAdapter } from "./provider-adapter";
import { buildProviderRequest } from "./provider-adapter";
import { readSummaryPlaceholderState } from "./frontmatter-placeholder";
import {
  createConfiguredProviderAdapter,
  type ConfiguredProviderAdapterInput
} from "./providers";

type RuntimeSettings = Pick<
  AiSummaryPluginSettings,
  | "provider"
  | "apiKey"
  | "model"
  | "summaryPrompt"
  | "takeawaysPrompt"
  | "summaryFrontmatterKey"
  | "pendingPlaceholderValue"
>;

export interface ProcessPendingNoteDependencies {
  readNoteContent: (filePath: string) => Promise<string>;
  writeNoteContent: (filePath: string, noteContent: string) => Promise<void>;
  createProviderAdapter?: (
    input: ConfiguredProviderAdapterInput
  ) => ProviderAdapter;
}

export type ProcessPendingNoteResult =
  | {
      status: "processed";
      filePath: string;
      enrichmentResult: EnrichmentResult;
    }
  | {
      status: "skipped";
      code: "none" | "not-pending" | "already-generated";
      filePath: string;
    }
  | {
      status: "failed";
      code:
        | "read-failed"
        | "invalid-settings"
        | "provider-failed"
        | "write-failed";
      filePath: string;
      message: string;
      cause?: unknown;
      validationFailures?: SettingsValidationFailure[];
    };

class ProcessPendingNoteWriteError extends Error {
  constructor(readonly cause: unknown) {
    super("Failed to write the processed note.");
    this.name = "ProcessPendingNoteWriteError";
  }
}

/**
 * Processes a single note through the shared enrichment pipeline without
 * depending on Obsidian UI concerns.
 */
export async function processPendingNote(
  filePath: string,
  settings: RuntimeSettings,
  dependencies: ProcessPendingNoteDependencies
): Promise<ProcessPendingNoteResult> {
  let noteContent: string;

  try {
    noteContent = await dependencies.readNoteContent(filePath);
  } catch (error) {
    return {
      status: "failed",
      code: "read-failed",
      filePath,
      message: "Could not read the note for AI summary processing.",
      cause: error
    };
  }

  const placeholderState = readSummaryPlaceholderState(
    noteContent,
    settings.summaryFrontmatterKey
  );

  if (placeholderState.isGenerated) {
    return {
      status: "skipped",
      code: "already-generated",
      filePath
    };
  }

  if (placeholderState.isNone) {
    return {
      status: "skipped",
      code: "none",
      filePath
    };
  }

  if (!placeholderState.isPending) {
    return {
      status: "skipped",
      code: "not-pending",
      filePath
    };
  }

  const validationResult = validateRuntimeSettings(settings);

  if (!validationResult.isValid) {
    return {
      status: "failed",
      code: "invalid-settings",
      filePath,
      message:
        validationResult.failures[0]?.message ??
        "The plugin settings are incomplete for AI summary processing.",
      validationFailures: validationResult.failures
    };
  }

  const providerAdapter = (
    dependencies.createProviderAdapter ?? createConfiguredProviderAdapter
  )({
    provider: settings.provider,
    apiKey: settings.apiKey
  });

  try {
    const noteContentForEnrichment = stripLeadingEnrichmentBlock(noteContent);
    const noteBody = extractNoteBody(noteContentForEnrichment);
    const summaryJob: SummaryJob = {
      filePath,
      provider: settings.provider,
      model: settings.model.trim(),
      noteBody,
      promptContract: createPromptContract(noteBody, {
        summaryPrompt: settings.summaryPrompt,
        takeawaysPrompt: settings.takeawaysPrompt
      })
    };
    const enrichmentResult = await providerAdapter.summarize(
      buildProviderRequest(summaryJob)
    );
    const updatedNoteContent = applyEnrichmentResultToNote(
      noteContentForEnrichment,
      enrichmentResult
    );

    try {
      await dependencies.writeNoteContent(filePath, updatedNoteContent);
    } catch (error) {
      throw new ProcessPendingNoteWriteError(error);
    }

    return {
      status: "processed",
      filePath,
      enrichmentResult
    };
  } catch (error) {
    const errorCode = isWriteFailure(error) ? "write-failed" : "provider-failed";

    return {
      status: "failed",
      code: errorCode,
      filePath,
      message:
        errorCode === "write-failed"
          ? "AI summary was generated, but the note could not be updated."
          : `AI summary failed with the configured ${formatProviderLabel(settings.provider)} provider.`,
      cause: unwrapFailureCause(error)
    };
  }
}

function extractNoteBody(noteContent: string): string {
  const frontmatterMatch = noteContent.match(/^---\n[\s\S]*?\n---(\n?)([\s\S]*)$/);

  if (!frontmatterMatch) {
    return noteContent.trim();
  }

  return (frontmatterMatch[2] ?? "").replace(/^\n/, "").trim();
}

function stripLeadingEnrichmentBlock(noteContent: string): string {
  const frontmatterMatch = noteContent.match(/^---\n[\s\S]*?\n---(\n?)([\s\S]*)$/);

  if (!frontmatterMatch) {
    return noteContent;
  }

  const frontmatter = noteContent.slice(
    0,
    noteContent.length -
      (frontmatterMatch[2]?.length ?? 0) -
      (frontmatterMatch[1]?.length ?? 0)
  );
  const sanitizedBody = removeLeadingEnrichmentBlock(frontmatterMatch[2] ?? "");

  if (!sanitizedBody) {
    return frontmatter;
  }

  return [frontmatter, "", sanitizedBody].join("\n");
}

function removeLeadingEnrichmentBlock(body: string): string {
  const trimmedBody = body.replace(/^\n+/, "");
  const enrichmentBlockPattern =
    /^> > .+\n\n\*\*Key takeaways:\*\*\n(?:- .+(?:\n|$))+(\n*)/;
  const match = trimmedBody.match(enrichmentBlockPattern);

  if (!match) {
    return trimmedBody;
  }

  const remainingBody = trimmedBody.slice(match[0].length);

  return remainingBody.replace(/^\n+/, "");
}

function formatProviderLabel(provider: RuntimeSettings["provider"]): string {
  return provider === "openai" ? "OpenAI" : "Gemini";
}

function isWriteFailure(error: unknown): error is ProcessPendingNoteWriteError {
  return error instanceof ProcessPendingNoteWriteError;
}

function unwrapFailureCause(error: unknown): unknown {
  return isWriteFailure(error) ? error.cause : error;
}
