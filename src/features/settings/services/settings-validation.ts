import type {
  AiSummaryPluginSettings,
  SummaryProvider
} from "./plugin-settings";

export type SettingsValidationFailureCode =
  | "missing-provider"
  | "invalid-provider"
  | "missing-api-key"
  | "missing-model";

export interface SettingsValidationFailure {
  code: SettingsValidationFailureCode;
  field: "provider" | "apiKey" | "model";
  message: string;
}

export interface SettingsValidationResult {
  isValid: boolean;
  failures: SettingsValidationFailure[];
}

export interface RuntimeSettingsValidationInput {
  provider?: string;
  apiKey?: string;
  model?: string;
}

export type SettingsRecoveryRescanAction = "cancel" | "noop" | "schedule";

export function validateRuntimeSettings(
  settings: Pick<AiSummaryPluginSettings, "provider" | "apiKey" | "model"> |
    RuntimeSettingsValidationInput
): SettingsValidationResult {
  const failures: SettingsValidationFailure[] = [];

  if (!settings.provider) {
    failures.push({
      code: "missing-provider",
      field: "provider",
      message: "Select a supported provider before processing notes."
    });
  } else if (!isSummaryProvider(settings.provider)) {
    failures.push({
      code: "invalid-provider",
      field: "provider",
      message: "Choose either Gemini or OpenAI before processing notes."
    });
  }

  if (!settings.apiKey?.trim()) {
    failures.push({
      code: "missing-api-key",
      field: "apiKey",
      message: "Add an API key before processing notes."
    });
  }

  if (!settings.model?.trim()) {
    failures.push({
      code: "missing-model",
      field: "model",
      message: "Add a model before processing notes."
    });
  }

  return {
    isValid: failures.length === 0,
    failures
  };
}

export function getSettingsRecoveryRescanAction(
  previousSettings: RuntimeSettingsValidationInput,
  nextSettings: RuntimeSettingsValidationInput,
  hasPendingRecoveryRescan: boolean
): SettingsRecoveryRescanAction {
  const previousIsValid = validateRuntimeSettings(previousSettings).isValid;
  const nextIsValid = validateRuntimeSettings(nextSettings).isValid;

  if (!nextIsValid) {
    return hasPendingRecoveryRescan ? "cancel" : "noop";
  }

  if (!previousIsValid || hasPendingRecoveryRescan) {
    return "schedule";
  }

  return "noop";
}

function isSummaryProvider(value: string): value is SummaryProvider {
  return value === "gemini" || value === "openai";
}
