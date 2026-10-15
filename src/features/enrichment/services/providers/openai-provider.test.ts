import { describe, expect, it, vi } from "vitest";

import { createPromptContract } from "../prompt-contract";
import type { ProviderRequest } from "../provider-adapter";
import {
  createOpenAiProvider,
  OpenAiProviderError
} from "./openai-provider";

describe("createOpenAiProvider", () => {
  it("uses the configured API key and model to request OpenAI content", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: [
                  "The author argues consistency matters most. Daily repetition builds understanding over time. Discipline compounds into confidence.",
                  "",
                  "- Show up every day.",
                  "- Split time between DSA and system design.",
                  "- Explain ideas in your own words."
                ].join("\n")
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
    const openAiProvider = createOpenAiProvider({
      apiKey: "openai-key",
      fetchFn
    });

    await expect(openAiProvider.summarize(createProviderRequest())).resolves.toEqual({
      summary:
        "The author argues consistency matters most. Daily repetition builds understanding over time. Discipline compounds into confidence.",
      takeaways: [
        "- Show up every day.",
        "- Split time between DSA and system design.",
        "- Explain ideas in your own words."
      ]
    });

    expect(openAiProvider.provider).toBe("openai");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer openai-key",
          "Content-Type": "application/json"
        }
      })
    );

    const requestCall = fetchFn.mock.calls[0];

    expect(requestCall).toBeDefined();

    const requestInit = requestCall?.[1];

    expect(typeof requestInit?.body).toBe("string");

    const requestBody = JSON.parse(requestInit?.body as string) as {
      model: string;
      messages: Array<{
        role: string;
        content: string;
      }>;
    };

    expect(requestBody.model).toBe("gpt-4.1-mini");
    expect(requestBody.messages[0]?.role).toBe("user");
    expect(requestBody.messages[0]?.content).toContain(
      "In exactly 3 sentences, state the main thesis or finding of this page. No preamble."
    );
    expect(requestBody.messages[0]?.content).toContain(
      "Return 3-5 markdown bullet lines (- item) with the most actionable insights from this page."
    );
    expect(requestBody.messages[0]?.content).toContain(
      "A note body worth summarizing."
    );
  });

  it("fails clearly when OpenAI returns a non-success response", async () => {
    const openAiProvider = createOpenAiProvider({
      apiKey: "openai-key",
      fetchFn: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("bad gateway", { status: 502 }))
    });

    await expect(openAiProvider.summarize(createProviderRequest())).rejects.toThrow(
      new OpenAiProviderError("OpenAI request failed with status 502.")
    );
  });

  it("fails clearly when OpenAI returns no generated text", async () => {
    const openAiProvider = createOpenAiProvider({
      apiKey: "openai-key",
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: []
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

    await expect(openAiProvider.summarize(createProviderRequest())).rejects.toThrow(
      new OpenAiProviderError("OpenAI response did not include generated text.")
    );
  });

  it("fails clearly when OpenAI output is malformed for the shared contract", async () => {
    const openAiProvider = createOpenAiProvider({
      apiKey: "openai-key",
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "Only two sentences here. That breaks the contract.\n\n- One takeaway."
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

    await expect(openAiProvider.summarize(createProviderRequest())).rejects.toMatchObject(
      {
        name: "OpenAiProviderError",
        message: "OpenAI response did not match the shared enrichment contract."
      }
    );
  });
});

function createProviderRequest(): ProviderRequest {
  return {
    model: "gpt-4.1-mini",
    noteBody: "A note body worth summarizing.",
    promptContract: createPromptContract("A note body worth summarizing.")
  };
}
