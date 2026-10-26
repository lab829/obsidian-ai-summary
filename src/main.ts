import { Notice, Plugin, TFile } from "obsidian";

import {
  DEFAULT_GENERATED_PLACEHOLDER,
  DEFAULT_NONE_PLACEHOLDER,
  DEFAULT_PENDING_PLACEHOLDER
} from "./features/enrichment/services/frontmatter-placeholder";
import {
  processPendingNote,
  type ProcessPendingNoteResult
} from "./features/enrichment/services/process-pending-note";
import {
  DEFAULT_SETTINGS,
  type AiSummaryPluginSettings
} from "./features/settings/services/plugin-settings";
import { getSettingsRecoveryRescanAction } from "./features/settings/services/settings-validation";
import { AiSummarySettingTab } from "./features/settings/ui/AiSummarySettingTab";

export default class ObsidianAiSummaryPlugin extends Plugin {
  settings: AiSummaryPluginSettings = DEFAULT_SETTINGS;
  private readonly pendingNoteTimers = new Map<string, number>();
  private readonly processingNotePaths = new Set<string>();
  private readonly failureNoticeTimestamps = new Map<string, number>();
  private settingsRecoveryTimer: number | null = null;

  override async onload(): Promise<void> {
    await this.loadPluginSettings();

    this.addSettingTab(new AiSummarySettingTab(this.app, this));

    this.addCommand({
      id: "show-plugin-status",
      name: "Show plugin status",
      callback: () => {
        const provider = this.settings.provider;
        new Notice(
          `AI Summary is loaded. Provider: ${provider}. Auto-process: ${this.settings.autoProcessNewNotes ? "on" : "off"}. States: ${this.settings.summaryFrontmatterKey}=${DEFAULT_NONE_PLACEHOLDER}|${DEFAULT_PENDING_PLACEHOLDER}|${DEFAULT_GENERATED_PLACEHOLDER}.`
        );
      }
    });

    // Vault "create" fires for every file during startup; wait for layout ready.
    this.app.workspace.onLayoutReady(() => {
      this.registerVaultListeners();

      if (this.settings.autoProcessNewNotes) {
        void this.processPendingNotesOnLoad();
      }
    });
  }

  async updateSetting<Key extends keyof AiSummaryPluginSettings>(
    key: Key,
    value: AiSummaryPluginSettings[Key]
  ): Promise<void> {
    const previousSettings = this.settings;

    this.settings = {
      ...this.settings,
      [key]: value
    };

    await this.saveData(this.settings);

    if (key === "autoProcessNewNotes") {
      if (value) {
        void this.processPendingNotesOnLoad();
      } else {
        this.clearPendingNoteTimers();
        this.clearSettingsRecoveryTimer();
      }

      return;
    }

    if (!this.settings.autoProcessNewNotes || !isRecoverySettingKey(key)) {
      return;
    }

    const recoveryAction = getSettingsRecoveryRescanAction(
      previousSettings,
      this.settings,
      this.settingsRecoveryTimer !== null
    );

    if (recoveryAction === "cancel") {
      this.clearSettingsRecoveryTimer();
    }

    if (recoveryAction === "schedule") {
      this.scheduleSettingsRecoveryRescan();
    }
  }

  override onunload(): void {
    this.clearPendingNoteTimers();
    this.clearSettingsRecoveryTimer();
  }

  private async loadPluginSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...coercePartialSettings(await this.loadData())
    };
  }

  private registerVaultListeners(): void {
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.scheduleNoteProcessingIfEligible(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.scheduleNoteProcessingIfEligible(file);
      })
    );
  }

  private scheduleNoteProcessingIfEligible(file: unknown): void {
    if (!this.settings.autoProcessNewNotes || !isMarkdownFile(file)) {
      return;
    }

    const existingTimer = this.pendingNoteTimers.get(file.path);

    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      this.pendingNoteTimers.delete(file.path);
      void this.processNotePath(file.path);
    }, this.settings.processingDebounceMs);

    this.pendingNoteTimers.set(file.path, timer);
  }

  private async processPendingNotesOnLoad(): Promise<void> {
    const { summaryFrontmatterKey, pendingPlaceholderValue } = this.settings;

    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);

      // Skip notes the metadata cache already knows are not pending.
      if (cache && cache.frontmatter?.[summaryFrontmatterKey] !== pendingPlaceholderValue) {
        continue;
      }

      const result = await this.processNotePath(file.path);

      if (result?.status === "failed" && result.code === "invalid-settings") {
        break;
      }
    }
  }

  private async processNotePath(
    filePath: string
  ): Promise<ProcessPendingNoteResult | null> {
    if (this.processingNotePaths.has(filePath)) {
      return null;
    }

    this.processingNotePaths.add(filePath);

    try {
      const result = await processPendingNote(filePath, this.settings, {
        readNoteContent: async (path) => {
          const file = this.getMarkdownFile(path);

          return this.app.vault.cachedRead(file);
        },
        writeNoteContent: async (path, noteContent) => {
          const file = this.getMarkdownFile(path);

          await this.app.vault.modify(file, noteContent);
        }
      });

      if (result.status === "failed") {
        this.showFailureNotice(result.message);
      }

      return result;
    } finally {
      this.processingNotePaths.delete(filePath);
    }
  }

  private getMarkdownFile(path: string): TFile {
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!isMarkdownFile(file)) {
      throw new Error(`Markdown file not found: ${path}`);
    }

    return file;
  }

  private showFailureNotice(message: string): void {
    const now = Date.now();
    const lastNoticeTimestamp = this.failureNoticeTimestamps.get(message) ?? 0;

    if (now - lastNoticeTimestamp < 5000) {
      return;
    }

    this.failureNoticeTimestamps.set(message, now);
    new Notice(message);
  }

  private clearPendingNoteTimers(): void {
    for (const timer of this.pendingNoteTimers.values()) {
      window.clearTimeout(timer);
    }

    this.pendingNoteTimers.clear();
  }

  private scheduleSettingsRecoveryRescan(): void {
    this.clearSettingsRecoveryTimer();

    this.settingsRecoveryTimer = window.setTimeout(() => {
      this.settingsRecoveryTimer = null;
      void this.processPendingNotesOnLoad();
    }, this.settings.processingDebounceMs);
  }

  private clearSettingsRecoveryTimer(): void {
    if (this.settingsRecoveryTimer) {
      window.clearTimeout(this.settingsRecoveryTimer);
      this.settingsRecoveryTimer = null;
    }
  }
}

function coercePartialSettings(value: unknown): Partial<AiSummaryPluginSettings> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isMarkdownFile(file: unknown): file is TFile {
  return file instanceof TFile && file.extension === "md";
}

function isRecoverySettingKey(
  key: keyof AiSummaryPluginSettings
): key is "provider" | "apiKey" | "model" {
  return key === "provider" || key === "apiKey" || key === "model";
}
