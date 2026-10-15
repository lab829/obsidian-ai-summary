import type { SummaryProvider } from "../../../settings/services/plugin-settings";
import type { ProviderAdapter } from "../provider-adapter";
import {
  createGeminiProvider,
  GeminiProviderError
} from "./gemini-provider";
import {
  createOpenAiProvider,
  OpenAiProviderError
} from "./openai-provider";
import {
  discoverProviderModels,
  ProviderModelDiscoveryError,
  type ProviderModelOption
} from "./provider-model-discovery";

export { createGeminiProvider, GeminiProviderError };
export { createOpenAiProvider, OpenAiProviderError };
export {
  discoverProviderModels,
  ProviderModelDiscoveryError,
  type ProviderModelOption
};

export interface ConfiguredProviderAdapterInput {
  provider: SummaryProvider;
  apiKey: string;
  fetchFn?: typeof globalThis.fetch;
}

export function createConfiguredProviderAdapter(
  input: ConfiguredProviderAdapterInput
): ProviderAdapter {
  const sharedConfig = input.fetchFn
    ? {
        apiKey: input.apiKey,
        fetchFn: input.fetchFn
      }
    : {
        apiKey: input.apiKey
      };

  if (input.provider === "gemini") {
    return createGeminiProvider(sharedConfig);
  }

  return createOpenAiProvider(sharedConfig);
}

export async function discoverConfiguredProviderModels(
  input: ConfiguredProviderAdapterInput
): Promise<ProviderModelOption[]> {
  return discoverProviderModels(input);
}
