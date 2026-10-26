import {
  formatProviderLabel,
  type SummaryProvider
} from "../../../settings/services/plugin-settings";

export interface ProviderModelOption {
  id: string;
  label: string;
}

export interface ProviderModelDiscoveryInput {
  provider: SummaryProvider;
  apiKey: string;
  fetchFn?: typeof fetch;
}

interface GeminiModelListResponse {
  models?: Array<{
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }>;
}

interface OpenAiModelListResponse {
  data?: Array<{
    id?: string;
  }>;
}

export class ProviderModelDiscoveryError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ProviderModelDiscoveryError";
    this.cause = cause;
  }
}

export async function discoverProviderModels(
  input: ProviderModelDiscoveryInput
): Promise<ProviderModelOption[]> {
  try {
    if (input.provider === "gemini") {
      return await discoverGeminiModels(input);
    }

    return await discoverOpenAiModels(input);
  } catch (error) {
    if (error instanceof ProviderModelDiscoveryError) {
      throw error;
    }

    throw new ProviderModelDiscoveryError(
      `${formatProviderLabel(input.provider)} model discovery could not reach the provider.`,
      error
    );
  }
}

async function discoverGeminiModels(
  input: ProviderModelDiscoveryInput
): Promise<ProviderModelOption[]> {
  const response = await (input.fetchFn ?? window.fetch)(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(input.apiKey)}`
  );

  if (!response.ok) {
    throw new ProviderModelDiscoveryError(
      `Gemini model discovery failed with status ${response.status}.`
    );
  }

  const responseJson = (await response.json()) as GeminiModelListResponse;
  const options =
    responseJson.models
      ?.filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent")
      )
      .map((model) => {
        const modelId = model.name?.split("/").pop()?.trim() ?? "";

        return {
          id: modelId,
          label: model.displayName?.trim() || modelId
        };
      })
      .filter((model): model is ProviderModelOption => Boolean(model.id))
      .sort(compareModelOptions) ?? [];

  if (options.length === 0) {
    throw new ProviderModelDiscoveryError(
      "Gemini model discovery returned no generateContent models."
    );
  }

  return options;
}

async function discoverOpenAiModels(
  input: ProviderModelDiscoveryInput
): Promise<ProviderModelOption[]> {
  const response = await (input.fetchFn ?? window.fetch)(
    "https://api.openai.com/v1/models",
    {
      headers: {
        Authorization: `Bearer ${input.apiKey}`
      }
    }
  );

  if (!response.ok) {
    throw new ProviderModelDiscoveryError(
      `OpenAI model discovery failed with status ${response.status}.`
    );
  }

  const responseJson = (await response.json()) as OpenAiModelListResponse;
  const options =
    responseJson.data
      ?.map((model) => model.id?.trim() ?? "")
      .filter((modelId) => isSelectableOpenAiModel(modelId))
      .map((modelId) => ({
        id: modelId,
        label: modelId
      }))
      .sort(compareModelOptions) ?? [];

  if (options.length === 0) {
    throw new ProviderModelDiscoveryError(
      "OpenAI model discovery returned no chat-capable models."
    );
  }

  return options;
}

function isSelectableOpenAiModel(modelId: string): boolean {
  return (
    modelId.startsWith("gpt-") ||
    modelId.startsWith("chatgpt-") ||
    modelId.startsWith("o1") ||
    modelId.startsWith("o3") ||
    modelId.startsWith("o4")
  );
}

function compareModelOptions(
  left: ProviderModelOption,
  right: ProviderModelOption
): number {
  return left.label.localeCompare(right.label);
}
