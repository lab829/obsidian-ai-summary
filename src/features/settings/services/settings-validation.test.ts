import { describe, expect, it } from "vitest";

import {
  getSettingsRecoveryRescanAction,
  validateRuntimeSettings
} from "./settings-validation";

describe("validateRuntimeSettings", () => {
  it("reports missing provider, API key, and model with structured failure reasons", () => {
    expect(validateRuntimeSettings({})).toEqual({
      isValid: false,
      failures: [
        {
          code: "missing-provider",
          field: "provider",
          message: "Select a supported provider before processing notes."
        },
        {
          code: "missing-api-key",
          field: "apiKey",
          message: "Add an API key before processing notes."
        },
        {
          code: "missing-model",
          field: "model",
          message: "Add a model before processing notes."
        }
      ]
    });
  });

  it("reports an invalid provider separately from missing credentials", () => {
    expect(
      validateRuntimeSettings({
        provider: "anthropic",
        apiKey: "key",
        model: "claude"
      })
    ).toEqual({
      isValid: false,
      failures: [
        {
          code: "invalid-provider",
          field: "provider",
          message: "Choose either Gemini or OpenAI before processing notes."
        }
      ]
    });
  });

  it("accepts valid runtime settings", () => {
    expect(
      validateRuntimeSettings({
        provider: "openai",
        apiKey: "key",
        model: "gpt-4.1-mini"
      })
    ).toEqual({
      isValid: true,
      failures: []
    });
  });
});

describe("getSettingsRecoveryRescanAction", () => {
  it("schedules a recovery rescan when settings become valid", () => {
    expect(
      getSettingsRecoveryRescanAction(
        {
          provider: "openai",
          apiKey: "",
          model: "gpt-4.1-mini"
        },
        {
          provider: "openai",
          apiKey: "key",
          model: "gpt-4.1-mini"
        },
        false
      )
    ).toBe("schedule");
  });

  it("keeps debouncing while valid settings are still being edited", () => {
    expect(
      getSettingsRecoveryRescanAction(
        {
          provider: "openai",
          apiKey: "key",
          model: "gpt-4.1-mini"
        },
        {
          provider: "openai",
          apiKey: "key-2",
          model: "gpt-4.1-mini"
        },
        true
      )
    ).toBe("schedule");
  });

  it("cancels a pending recovery rescan when settings become invalid again", () => {
    expect(
      getSettingsRecoveryRescanAction(
        {
          provider: "openai",
          apiKey: "",
          model: "gpt-4.1-mini"
        },
        {
          provider: "openai",
          apiKey: "",
          model: ""
        },
        true
      )
    ).toBe("cancel");
  });

  it("does nothing when settings stay valid and no recovery rescan is pending", () => {
    expect(
      getSettingsRecoveryRescanAction(
        {
          provider: "openai",
          apiKey: "key",
          model: "gpt-4.1-mini"
        },
        {
          provider: "openai",
          apiKey: "key-2",
          model: "gpt-4.1-mini"
        },
        false
      )
    ).toBe("noop");
  });
});
