# TESTING.md

This guide is for a normal human being who just wants to check whether the plugin works.
You do not need to know TypeScript, GitHub Actions, or Obsidian plugin internals.

## What this plugin is supposed to do

If a note contains:

```md
---
ai_summary: pending
---
```

the plugin should:

1. generate a summary,
2. insert the generated block near the top of the note, and
3. change `ai_summary: pending` to `ai_summary: generated`.

If the plugin is missing setup information, it should leave the note alone and show a small warning notice.

## Before you start

You need:

- Obsidian Desktop installed
- an Obsidian vault you can use for testing
- this repository on your computer
- one provider API key:
  - Gemini, or
  - OpenAI

This guide is for the desktop app only. Mobile testing is not in scope for v1.

## Part 1 — Install the plugin locally

### Step 1 — Build the plugin

Open Terminal in this repository and run:

```bash
pnpm build
```

Optional dev shortcut:

1. Copy `.env.local.example` to `.env.local`
2. Set `OBSIDIAN_PLUGIN_DIR` to your local vault plugin folder, for example `<vault>/.obsidian/plugins/lab-ai-summary/`
3. Run `pnpm build:sync`

That will build the plugin and copy `main.js`, `manifest.json`, and `styles.css` into the plugin folder automatically.

### Step 2 — Find your vault's plugin folder

Inside your Obsidian vault, find:

```text
.obsidian/plugins/
```

If `.obsidian` is hidden on macOS, press `Command + Shift + .` in Finder to show hidden files.

### Step 3 — Create the plugin folder

Create this folder inside your vault:

```text
.obsidian/plugins/lab-ai-summary/
```

### Step 4 — Copy the built plugin files

Copy these files from this repository:

- `main.js`
- `manifest.json`
- `styles.css`

into:

```text
<your-vault>/.obsidian/plugins/lab-ai-summary/
```

If you used `pnpm build:sync`, this copy step was already done for you.

### Step 5 — Enable the plugin in Obsidian

In Obsidian:

1. Open `Settings`
2. Open `Community plugins`
3. Turn off `Restricted mode` if needed
4. Reload plugins or restart Obsidian
5. Enable `AI Summary`

## Part 2 — Configure the plugin

In Obsidian settings, open `AI Summary` and fill in:

- `Provider`: `Gemini` or `OpenAI`
- `API key`: paste your real API key
- `Model`:
  - after you add the API key, the plugin should try to load a provider-aware model dropdown
  - pick one of the discovered models in the happy path
  - if model discovery fails, the plugin should fall back to a text field with a readable message
  - manual examples: `gemini-2.5-flash` or `gpt-4.1-mini`
- `Summary prompt`: optional; leave the default if you are not testing prompt customization
- `Takeaways prompt`: optional; leave the default if you are not testing prompt customization
- `Auto-process new notes`: ON
- `Processing debounce (ms)`: leave `1500` unless you are testing timing behavior

## Part 3 — Happy-path manual note test

### Step 1 — Create a test note

Create a new note in Obsidian and paste this:

```md
---
title: Test Summary Note
ai_summary: pending
---

# Source

This article argues that small daily habits matter more than short bursts of motivation. Repeating simple study routines every day creates durable learning over time. The author recommends focused repetition, deliberate explanation, and consistency.
```

### Step 2 — Wait a few seconds

The plugin waits briefly before processing. Wait about 3 to 5 seconds.

### Step 3 — Confirm the result

The note should now:

- show `ai_summary: generated`
- include a generated summary block directly below the frontmatter
- still contain the original body text underneath

It should look roughly like this:

```md
---
title: Test Summary Note
ai_summary: generated
---

> > [generated summary]

**Key takeaways:**
- ...
- ...
- ...

# Source

This article argues ...
```

## Part 4 — Generated notes should not run again

Edit the same note after it already says `ai_summary: generated`.

Wait a few seconds.

Expected result:

- no second summary block
- no duplicate processing
- the note stays `generated`

## Part 5 — Missing-configuration safety test

This confirms that failures are safe.

### Step 1 — Remove the API key or model

Go back to plugin settings and delete either:

- the API key, or
- the model

### Step 2 — Create another pending note

Paste this into a new note:

```md
---
title: Missing Config Test
ai_summary: pending
---

This note should stay untouched because configuration is incomplete.
```

### Step 3 — Wait a few seconds

Expected result:

- Obsidian shows a small notice
- the note stays unchanged
- the note still says `ai_summary: pending`

That is correct behavior.

## Part 6 — Web Clipper test

Do this only after the manual note test works.

### Step 1 — Make sure your clipper template contains the trigger

Your clipper template must include:

```md
---
title: {{title}}
source: {{url}}
ai_summary: pending
---

{{content}}
```

If the note arrives without `ai_summary: pending`, the plugin has nothing to process.

### Step 2 — Clip a real page

Use Web Clipper to save a page into the same Obsidian vault.

### Step 3 — Open the clipped note

Wait a few seconds.

Expected result:

- the note is processed automatically
- the summary block appears
- the status changes to `ai_summary: generated`

## Pass / fail checklist

The feature is working if all of these are true:

- pending notes get processed automatically
- the summary block appears near the top of the note
- the original note body stays intact
- the note changes from `pending` to `generated`
- generated notes are not processed twice
- missing configuration does not damage the note
- failed processing leaves the note as `pending`

## Troubleshooting

### Problem: Nothing happens

Check these first:

- the plugin is enabled
- `Auto-process new notes` is ON
- the note contains exactly `ai_summary: pending`
- a real API key is saved
- a real model is saved
- you waited at least 3 to 5 seconds

### Problem: The plugin used to fail, then I fixed the settings, but the note still did not process

Current behavior may require one of these:

- edit the note again so Obsidian emits another modify event, or
- restart Obsidian

If this happens, treat it as a bug or regression and record it during testing.

### Problem: The clipped note never gets processed

Your clipper template probably does not include:

```md
ai_summary: pending
```

### Problem: I changed code but Obsidian still behaves the old way

Run:

```bash
pnpm build
```

Then copy `main.js`, `manifest.json`, and `styles.css` into the vault plugin folder again and reload Obsidian.

### Problem: I cannot find `.obsidian`

It is probably hidden. On macOS, press `Command + Shift + .` in Finder.
