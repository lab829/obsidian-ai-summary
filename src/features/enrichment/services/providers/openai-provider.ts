import { normalizeProviderResponse } from "../response-normalizer";
import type { ProviderAdapter, ProviderRequest } from "../provider-adapter";

interface OpenAiProviderConfig {
  apiKey: string;
  fetchFn?: typeof globalThis.fetch;
}

interface OpenAiChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

export class OpenAiProviderError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "OpenAiProviderError";
    this.cause = cause;
  }
}

/**
 * Creates an OpenAI adapter that conforms to the shared provider contract.
 */
export function createOpenAiProvider(
  config: OpenAiProviderConfig
): ProviderAdapter {
  return {
    provider: "openai",
    summarize: async (request) => summarizeWithOpenAi(config, request)
  };
}

async function summarizeWithOpenAi(
  config: OpenAiProviderConfig,
  request: ProviderRequest
) {
  const response = await (config.fetchFn ?? globalThis.fetch)(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          {
            role: "user",
            content: buildOpenAiPrompt(request)
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new OpenAiProviderError(
      `OpenAI request failed with status ${response.status}.`
    );
  }

  const responseJson =
    (await response.json()) as OpenAiChatCompletionsResponse;
  const generatedText = extractGeneratedText(responseJson);

  if (!generatedText) {
    throw new OpenAiProviderError("OpenAI response did not include generated text.");
  }

  try {
    return normalizeProviderResponse(generatedText);
  } catch (error) {
    throw new OpenAiProviderError(
      "OpenAI response did not match the shared enrichment contract.",
      error
    );
  }
}

function buildOpenAiPrompt(request: ProviderRequest): string {
  return [
    request.promptContract.summaryPrompt,
    request.promptContract.takeawaysPrompt,
    "Page content:",
    request.promptContract.noteBody
  ].join("\n\n");
}

function extractGeneratedText(
  response: OpenAiChatCompletionsResponse
): string | null {
  const firstChoice = response.choices?.[0];
  const content = firstChoice?.message?.content;

  if (typeof content === "string") {
    return content.trim() || null;
  }

  const texts =
    content
      ?.filter((part) => part.type === "text" && Boolean(part.text?.trim()))
      .map((part) => part.text?.trim())
      .filter((value): value is string => Boolean(value)) ?? [];

  if (texts.length === 0) {
    return null;
  }

  return texts.join("\n").trim();
}
