import type { SummaryProvider } from "../../../settings/services/plugin-settings";
import type { ProviderAdapter } from "../provider-adapter";
import { createGeminiProvider } from "./gemini-provider";
import { createOpenAiProvider } from "./openai-provider";

export {
  discoverProviderModels,
  type ProviderModelOption
} from "./provider-model-discovery";

export interface ConfiguredProviderAdapterInput {
  provider: SummaryProvider;
  apiKey: string;
}

export function createConfiguredProviderAdapter(
  input: ConfiguredProviderAdapterInput
): ProviderAdapter {
  return input.provider === "gemini"
    ? createGeminiProvider(input)
    : createOpenAiProvider(input);
}
