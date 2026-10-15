import { describe, expect, it, vi } from "vitest";

import { createPromptContract } from "../prompt-contract";
import type { ProviderRequest } from "../provider-adapter";
import {
  createGeminiProvider,
  GeminiProviderError
} from "./gemini-provider";

describe("createGeminiProvider", () => {
  it("uses the configured API key and model to request Gemini content", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: [
                      "The author argues consistency matters most. Daily repetition builds understanding over time. Discipline compounds into confidence.",
                      "",
                      "- Show up every day.",
                      "- Split time between DSA and system design.",
                      "- Explain ideas in your own words."
                    ].join("\n")
                  }
                ]
              }
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
    const geminiProvider = createGeminiProvider({
      apiKey: "gemini-key",
      fetchFn
    });

    await expect(geminiProvider.summarize(createProviderRequest())).resolves.toEqual({
      summary:
        "The author argues consistency matters most. Daily repetition builds understanding over time. Discipline compounds into confidence.",
      takeaways: [
        "- Show up every day.",
        "- Split time between DSA and system design.",
        "- Explain ideas in your own words."
      ]
    });

    expect(geminiProvider.provider).toBe("gemini");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    const requestCall = fetchFn.mock.calls[0];

    expect(requestCall).toBeDefined();

    const requestInit = requestCall?.[1];

    expect(typeof requestInit?.body).toBe("string");

    const requestBody = JSON.parse(requestInit?.body as string) as {
      contents: Array<{
        parts: Array<{ text: string }>;
      }>;
    };

    expect(requestBody.contents[0]?.parts[0]?.text).toContain(
      "In exactly 3 sentences, state the main thesis or finding of this page. No preamble."
    );
    expect(requestBody.contents[0]?.parts[0]?.text).toContain(
      "Return 3-5 markdown bullet lines (- item) with the most actionable insights from this page."
    );
    expect(requestBody.contents[0]?.parts[0]?.text).toContain(
      "A note body worth summarizing."
    );
  });

  it("fails clearly when Gemini returns a non-success response", async () => {
    const geminiProvider = createGeminiProvider({
      apiKey: "gemini-key",
      fetchFn: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("bad gateway", { status: 502 }))
    });

    await expect(geminiProvider.summarize(createProviderRequest())).rejects.toThrow(
      new GeminiProviderError("Gemini request failed with status 502.")
    );
  });

  it("fails clearly when Gemini returns no candidate text", async () => {
    const geminiProvider = createGeminiProvider({
      apiKey: "gemini-key",
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { mimeType: "text/plain" } }]
                }
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
      )
    });

    await expect(geminiProvider.summarize(createProviderRequest())).rejects.toThrow(
      new GeminiProviderError("Gemini response did not include candidate text.")
    );
  });

  it("fails clearly when Gemini output is malformed for the shared contract", async () => {
    const geminiProvider = createGeminiProvider({
      apiKey: "gemini-key",
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: ["Only two sentences here. That breaks the contract.", "", "- One takeaway."].join(
                        "\n"
                      )
                    }
                  ]
                }
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
      )
    });

    await expect(geminiProvider.summarize(createProviderRequest())).rejects.toMatchObject(
      {
        name: "GeminiProviderError",
        message: "Gemini response did not match the shared enrichment contract."
      }
    );
  });
});

function createProviderRequest(): ProviderRequest {
  return {
    model: "gemini-2.5-flash",
    noteBody: "A note body worth summarizing.",
    promptContract: createPromptContract("A note body worth summarizing.")
  };
}
