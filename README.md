# AI Summary

AI Summary is an Obsidian plugin that watches notes with `ai_summary: pending`, inserts a generated summary and key takeaways at the top of the note body, and then marks the note `ai_summary: generated`.

Built and maintained by [Lab829](https://lab829.com).

## What it does

- Supports `ai_summary: none`, `ai_summary: pending`, and `ai_summary: generated` as explicit workflow states.
- Inserts the generated block directly below YAML frontmatter so the original note body stays intact.
- Supports Gemini and OpenAI with your own API key.
- Lets you customize the summary and takeaway prompts for the existing output shape.
- Desktop only for v1.

## Installation

### Community Plugins

AI Summary is in the [Obsidian community plugins directory](https://community.obsidian.md/plugins/lab-ai-summary). In Obsidian, open `Settings -> Community plugins -> Browse`, search for `AI Summary`, then install and enable it.

### Manual install from GitHub releases

1. Download `manifest.json`, `main.js`, and `styles.css` from the latest release.
2. Copy them into `<vault>/.obsidian/plugins/lab-ai-summary/`.
3. Reload Obsidian and enable the plugin.

## Setup

1. Open the plugin settings in Obsidian.
2. Choose `Gemini` or `OpenAI`.
3. Paste your API key.
4. Choose a model from the dropdown. If model discovery fails, enter the provider model ID manually.
5. Leave auto-process enabled if you want new pending notes to run automatically.

## Workflow

Use this frontmatter to opt a note into enrichment:

```md
---
ai_summary: pending
---
```

Successful processing inserts the generated block below frontmatter and flips the field to `ai_summary: generated`.

If you want a note to stay untouched until later, use `ai_summary: none` and change it to `pending` when you want enrichment to start.

## Disclosures

### Network use

This plugin makes network requests only to the AI provider you choose in settings, and only in these cases:

| When | Gemini | OpenAI |
| --- | --- | --- |
| Summarizing a note marked `ai_summary: pending` | `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` | `POST https://api.openai.com/v1/chat/completions` |
| Opening the plugin settings with an API key set (to list available models) | `GET https://generativelanguage.googleapis.com/v1beta/models` | `GET https://api.openai.com/v1/models` |

A note is summarized when it is created or edited while it has `ai_summary: pending` (after a short debounce), and once when the plugin loads for any notes that are still pending, as long as "Auto-process new notes" is on. Notes without `ai_summary: pending` are never sent.

What is sent: the body of the pending note (everything below the YAML frontmatter, excluding any previously generated summary block), your summary and takeaway prompts, and the model name. Frontmatter and other notes are not sent. Your use of the provider is governed by that provider's own terms and privacy policy.

### Your own API key

- You must supply your own Gemini or OpenAI API key. The plugin does not provide one and does not require an account with Lab829.
- The key is stored in this plugin's settings file in your vault (`<vault>/.obsidian/plugins/lab-ai-summary/data.json`) in plain text, like other Obsidian plugin settings. Do not sync or share that file if you don't want to share the key.
- The key is sent only to the provider you selected: as a `Bearer` authorization header for OpenAI, and as the `key` query parameter for Gemini (Google's documented API format). It is never sent to Lab829 or any other server.

### Paid features

The plugin is free and MIT licensed, and works with your own API key. Lab829 may offer an optional paid hosted service in the future (for example managed AI models). If that happens, it will be opt-in and clearly labeled, and using your own key will keep working without an account.

### Privacy

- No telemetry, analytics, or usage tracking. The plugin does not contact Lab829 servers.
- No ads.
- Requests go directly from Obsidian to your chosen provider; nothing is proxied.
- The source code is not obfuscated and is MIT licensed.

## Development

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

If you want to test the built plugin locally inside a vault:

1. Copy `.env.local.example` to `.env.local`.
2. Set `OBSIDIAN_PLUGIN_DIR` to `<vault>/.obsidian/plugins/lab-ai-summary/`.
3. Run `pnpm build:sync`.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). First-time contributors are asked to sign a short [Contributor License Agreement](CLA.md) by commenting on their pull request.

## Support

- Open a GitHub issue for bugs or feature requests.
- Include your Obsidian version, plugin version, provider, and any visible notice text when reporting a bug.

## License

MIT © 2026 Lab829
