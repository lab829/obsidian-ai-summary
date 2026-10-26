import { normalizeProviderResponse } from "../response-normalizer";
import {
  buildProviderPrompt,
  type ProviderAdapter,
  type ProviderRequest
} from "../provider-adapter";

interface GeminiProviderConfig {
  apiKey: string;
  fetchFn?: typeof fetch;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export class GeminiProviderError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "GeminiProviderError";
    this.cause = cause;
  }
}

/**
 * Creates a Gemini adapter that conforms to the shared provider contract.
 */
export function createGeminiProvider(
  config: GeminiProviderConfig
): ProviderAdapter {
  return {
    provider: "gemini",
    summarize: async (request) => summarizeWithGemini(config, request)
  };
}

async function summarizeWithGemini(
  config: GeminiProviderConfig,
  request: ProviderRequest
) {
  const response = await (config.fetchFn ?? window.fetch)(
    buildGeminiUrl(request, config.apiKey),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildProviderPrompt(request)
              }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new GeminiProviderError(
      `Gemini request failed with status ${response.status}.`
    );
  }

  const responseJson =
    (await response.json()) as GeminiGenerateContentResponse;
  const candidateText = extractCandidateText(responseJson);

  if (!candidateText) {
    throw new GeminiProviderError("Gemini response did not include candidate text.");
  }

  try {
    return normalizeProviderResponse(candidateText);
  } catch (error) {
    throw new GeminiProviderError(
      "Gemini response did not match the shared enrichment contract.",
      error
    );
  }
}

function buildGeminiUrl(request: ProviderRequest, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function extractCandidateText(
  response: GeminiGenerateContentResponse
): string | null {
  const texts =
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim())
      .filter((value): value is string => Boolean(value)) ?? [];

  if (texts.length === 0) {
    return null;
  }

  return texts.join("\n").trim();
}
