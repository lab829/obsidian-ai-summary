import { describe, expect, expectTypeOf, it } from "vitest";

import type { EnrichmentResult } from "../types/enrichment-result";
import type { SummaryJob } from "../types/summary-job";
import { createPromptContract } from "./prompt-contract";
import {
  buildProviderRequest,
  type ProviderAdapter,
  type ProviderRequest
} from "./provider-adapter";

describe("buildProviderRequest", () => {
  it("keeps the request provider-agnostic and rooted in the fixed prompt contract", () => {
    const summaryJob: SummaryJob = {
      filePath: "notes/example.md",
      model: "gemini-2.5-flash",
      noteBody: "Body",
      promptContract: createPromptContract("Body"),
      provider: "gemini"
    };

    expect(buildProviderRequest(summaryJob)).toEqual({
      model: "gemini-2.5-flash",
      noteBody: "Body",
      promptContract: createPromptContract("Body")
    });
  });
});

describe("provider adapter contract", () => {
  it("normalizes all adapters to the shared request and response types", () => {
    const adapter: ProviderAdapter = {
      provider: "openai",
      summarize: async (_request) => ({
        summary: "Sentence one. Sentence two. Sentence three.",
        takeaways: ["- one", "- two", "- three"]
      })
    };

    expect(adapter.provider).toBe("openai");
    expectTypeOf<ProviderRequest>().toMatchObjectType<{
      model: string;
      noteBody: string;
      promptContract: {
        noteBody: string;
        summaryPrompt: string;
        takeawaysPrompt: string;
      };
    }>();
    expectTypeOf<ReturnType<typeof adapter.summarize>>().toEqualTypeOf<
      Promise<EnrichmentResult>
    >();
  });
});
