# Contributing

Thanks for helping improve AI Summary.

## Before you open a pull request

- For anything larger than a small fix, open an issue first so we can agree on the approach.
- Run `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm build` locally. CI runs the same checks.
- Keep the plugin's disclosures true: no telemetry, no new network endpoints without updating the README "Disclosures" section.

## Contributor License Agreement

Lab829 asks every contributor to sign a lightweight [Contributor License Agreement](CLA.md) once. When you open your first pull request, the CLA Assistant bot will comment with instructions; reply with:

> I have read the CLA Document and I hereby sign the CLA

Your signature is recorded once and covers future pull requests. We can't merge pull requests until the CLA check passes.

## Release process

Releases are cut by the maintainers. This public repository is synced from Lab829's release pipeline, so pull requests merged here are ported into the release source before the next version ships.
