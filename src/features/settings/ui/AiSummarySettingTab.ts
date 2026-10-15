/* eslint-disable obsidianmd/ui/sentence-case */
import { PluginSettingTab, Setting } from "obsidian";

import type ObsidianAiSummaryPlugin from "../../../main";
import {
  discoverConfiguredProviderModels,
  type ProviderModelOption
} from "../../enrichment/services/providers";

export class AiSummarySettingTab extends PluginSettingTab {
  private modelSettingRenderId = 0;

  constructor(
    app: ObsidianAiSummaryPlugin["app"],
    private readonly plugin: ObsidianAiSummaryPlugin
  ) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;

    containerEl.empty();
    new Setting(containerEl)
      .setName("How it works")
      .setDesc(
        "The plugin only processes notes whose frontmatter contains ai_summary: pending."
      )
      .setHeading();

    new Setting(containerEl)
      .setName("Locked workflow contract")
      .setDesc(
        "Successful processing inserts a formatted enrichment block at the top of the note body and flips ai_summary to generated. Prompt wording is configurable, but the note-state workflow is fixed."
      );

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("Supported in v1: Gemini and OpenAI.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("gemini", "Gemini")
          .addOption("openai", "OpenAI")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value) => {
            await this.plugin.updateSetting("provider", value as "gemini" | "openai");
            void this.renderModelSetting(modelSettingContainer);
          });
      });

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Stored in plugin data on this device. Never proxied through a Lab829 service.")
      .addText((text) => {
        text
          .setPlaceholder("Paste your provider API key")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            await this.plugin.updateSetting("apiKey", value.trim());
            void this.renderModelSetting(modelSettingContainer);
          });
      });

    const modelSettingContainer = containerEl.createDiv();
    void this.renderModelSetting(modelSettingContainer);

    new Setting(containerEl)
      .setName("Summary prompt")
      .setDesc(
        "Customizes only the summary instruction for the existing summary output. It does not add new fields or change the note-state workflow."
      )
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("In exactly 3 sentences, state the main thesis or finding of this page. No preamble.")
          .setValue(this.plugin.settings.summaryPrompt)
          .onChange(async (value) => {
            await this.plugin.updateSetting("summaryPrompt", value);
          });

        textArea.inputEl.rows = 3;
      });

    new Setting(containerEl)
      .setName("Takeaways prompt")
      .setDesc(
        "Customizes only the takeaway instruction for the existing key-takeaway output. It does not add custom fields, tags, or templates."
      )
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder(
            "Return 3-5 markdown bullet lines (- item) with the most actionable insights from this page."
          )
          .setValue(this.plugin.settings.takeawaysPrompt)
          .onChange(async (value) => {
            await this.plugin.updateSetting("takeawaysPrompt", value);
          });

        textArea.inputEl.rows = 3;
      });

    new Setting(containerEl)
      .setName("Auto-process new notes")
      .setDesc("Keeps v1 aligned with the core promise: clip a note, then open it with the summary already in place.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.autoProcessNewNotes)
          .onChange(async (value) => {
            await this.plugin.updateSetting("autoProcessNewNotes", value);
          });
      });

    new Setting(containerEl)
      .setName("Processing debounce (ms)")
      .setDesc("Delay before the note-processing pipeline reacts to a new or changed note.")
      .addText((text) => {
        text
          .setPlaceholder("1500")
          .setValue(String(this.plugin.settings.processingDebounceMs))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);

            if (!Number.isFinite(parsed) || parsed < 0) {
              return;
            }

            await this.plugin.updateSetting("processingDebounceMs", parsed);
          });
      });

    new Setting(containerEl)
      .setName("Still not supported")
      .setDesc(
        "v1 still does not support custom frontmatter keys, custom pending values, custom fields, or multi-field enrichment templates. Only the wording of the existing summary and takeaway prompts is configurable."
      );
  }

  private async renderModelSetting(containerEl: HTMLElement): Promise<void> {
    const renderId = ++this.modelSettingRenderId;

    containerEl.empty();

    const apiKey = this.plugin.settings.apiKey.trim();

    if (!apiKey) {
      this.renderManualModelFallback(
        containerEl,
        "Add an API key to load models automatically. You can still type a provider model ID manually."
      );

      return;
    }

    new Setting(containerEl)
      .setName("Model")
      .setDesc(`Loading available ${formatProviderLabel(this.plugin.settings.provider)} models...`);

    try {
      const options = await discoverConfiguredProviderModels({
        provider: this.plugin.settings.provider,
        apiKey
      });

      if (!this.isCurrentModelRender(containerEl, renderId)) {
        return;
      }

      this.renderModelDropdown(containerEl, options);
    } catch (error) {
      if (!this.isCurrentModelRender(containerEl, renderId)) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : `Could not load ${formatProviderLabel(this.plugin.settings.provider)} models.`;

      this.renderManualModelFallback(
        containerEl,
        `${message} Enter a model ID manually instead.`
      );
    }
  }

  private renderModelDropdown(
    containerEl: HTMLElement,
    options: ProviderModelOption[]
  ): void {
    containerEl.empty();

    const currentModel = this.plugin.settings.model.trim();
    const hasCurrentModel = currentModel !== "" && options.some((option) => option.id === currentModel);

    new Setting(containerEl)
      .setName("Model")
      .setDesc(
        `Select a ${formatProviderLabel(this.plugin.settings.provider)} model. Manual entry is only needed if discovery fails.`
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("", "Select a model");

        for (const option of options) {
          dropdown.addOption(option.id, option.label);
        }

        if (!hasCurrentModel && currentModel !== "") {
          dropdown.addOption(currentModel, `${currentModel} (current)`);
        }

        dropdown
          .setValue(hasCurrentModel ? currentModel : currentModel || "")
          .onChange(async (value) => {
            await this.plugin.updateSetting("model", value.trim());
          });
      });
  }

  private renderManualModelFallback(
    containerEl: HTMLElement,
    description: string
  ): void {
    containerEl.empty();

    new Setting(containerEl)
      .setName("Model")
      .setDesc(description)
      .addText((text) => {
        text
          .setPlaceholder("e.g. gemini-2.5-flash or gpt-4.1-mini")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            await this.plugin.updateSetting("model", value.trim());
          });
      });
  }

  private isCurrentModelRender(
    containerEl: HTMLElement,
    renderId: number
  ): boolean {
    return containerEl.isConnected && renderId === this.modelSettingRenderId;
  }
}

function formatProviderLabel(provider: "gemini" | "openai"): string {
  return provider === "openai" ? "OpenAI" : "Gemini";
}
