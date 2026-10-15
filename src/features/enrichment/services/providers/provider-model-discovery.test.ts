import { describe, expect, it, vi } from "vitest";

import {
  discoverProviderModels,
  ProviderModelDiscoveryError
} from "./provider-model-discovery";

describe("discoverProviderModels", () => {
  it("returns generateContent Gemini models as dropdown options", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [
            {
              name: "models/gemini-2.5-flash",
              displayName: "Gemini 2.5 Flash",
              supportedGenerationMethods: ["generateContent"]
            },
            {
              name: "models/text-embedding-004",
              displayName: "Text Embedding 004",
              supportedGenerationMethods: ["embedContent"]
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    await expect(
      discoverProviderModels({
        provider: "gemini",
        apiKey: "gemini-key",
        fetchFn
      })
    ).resolves.toEqual([
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash"
      }
    ]);
  });

  it("returns only selectable OpenAI chat models as dropdown options", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "text-embedding-3-large" },
            { id: "gpt-4.1-mini" },
            { id: "o3-mini" }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    await expect(
      discoverProviderModels({
        provider: "openai",
        apiKey: "openai-key",
        fetchFn
      })
    ).resolves.toEqual([
      {
        id: "gpt-4.1-mini",
        label: "gpt-4.1-mini"
      },
      {
        id: "o3-mini",
        label: "o3-mini"
      }
    ]);
  });

  it("fails clearly when Gemini model discovery returns a non-success response", async () => {
    await expect(
      discoverProviderModels({
        provider: "gemini",
        apiKey: "gemini-key",
        fetchFn: vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("bad gateway", { status: 502 }))
      })
    ).rejects.toThrow(
      new ProviderModelDiscoveryError(
        "Gemini model discovery failed with status 502."
      )
    );
  });

  it("fails clearly when OpenAI model discovery returns no selectable models", async () => {
    await expect(
      discoverProviderModels({
        provider: "openai",
        apiKey: "openai-key",
        fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
          new Response(
            JSON.stringify({
              data: [{ id: "text-embedding-3-large" }]
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json"
              }
            }
          )
        )
      })
    ).rejects.toThrow(
      new ProviderModelDiscoveryError(
        "OpenAI model discovery returned no chat-capable models."
      )
    );
  });

  it("wraps unexpected Gemini discovery failures in a readable provider error", async () => {
    await expect(
      discoverProviderModels({
        provider: "gemini",
        apiKey: "gemini-key",
        fetchFn: vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"))
      })
    ).rejects.toThrow("Gemini model discovery could not reach the provider.");
  });
});
