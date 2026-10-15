# CHANGELOG.md

## [Unreleased]

### Fixed
- **Public export dry-run** — `pnpm export:public:dry-run` no longer writes under `.tmp/`; it validates sources and prints the export manifest only.
- **Settings recovery rescan** — fixing missing configuration now retriggers pending-note processing without requiring an app restart.

### Added
- **Public mirror release workflow** — maintainers can now export an allowlisted OSS repo surface and sync it to `lab829/obsidian-ai-summary` only from the controlled release path.
- **Provider model dropdowns** — plugin settings now load provider-aware Gemini and OpenAI model lists, with manual model entry as a fallback when discovery fails.
- **Configurable summary and takeaway prompts** — users can now customize the two existing enrichment instructions from plugin settings.
- **Local plugin sync helper** — developers can now sync build artifacts into a local Obsidian plugin folder with an optional dev-only script.
- **Optional none state** — notes can now stay unprocessed with `ai_summary: none` and begin enrichment when changed to `pending`.
- **Human testing guide** — added a dedicated test document for non-technical users plus a compact README version with troubleshooting.
- **Automatic enrichment pipeline** — added startup and vault-event processing that enriches pending notes and leaves failures ungenerated.
- **OpenAI provider adapter** — added OpenAI request and response mapping for the shared enrichment contract.
- **Gemini provider adapter** — added Gemini request and response mapping for the shared enrichment contract.
- **Local enrichment mutation core** — added the provider-agnostic note insertion and `ai_summary` state-transition services for the generated top-of-note summary block.
- **Provider contract core** — added the fixed MVP prompt composer, provider adapter interface, and normalized response parsing layer.
- **Project IDE rule files** — generated Cursor, Windsurf, Copilot, Claude, and GitHub agent instruction files so collaborators and agents share the same Lab829 operating contract.

### Changed
- **Desktop-only release scope** — aligned the manifest and canonical docs so the v1 plugin is explicitly desktop-only until mobile compatibility is implemented deliberately.
- **Launch-facing docs and metadata** — aligned the manifest, README, and repository licensing with the final MVP enrichment flow.
- **Settings contract alignment** — removed unsupported prompt and frontmatter controls from settings and aligned the UI with the locked MVP enrichment flow.
- **Summary output contract** — clarified that successful enrichment inserts a formatted block at the top of the note body and updates frontmatter from `ai_summary: pending` to `ai_summary: generated`.

## 0.1.0 - 2026-03-28

- Scaffolded the official-style Obsidian plugin foundation with TypeScript, esbuild, ESLint, Vitest, and pnpm enforcement.
- Locked the v1 trigger contract to `ai_summary: pending` and documented product and architecture guardrails.
- Added CI verification and the branch-close bypass prevention hook.
