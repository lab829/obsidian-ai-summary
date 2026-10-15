#!/usr/bin/env node
// check-pnpm.js
// Prevents npm/yarn usage in this repository. Always use pnpm.
// Added by 829-architect. Do not remove.

const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.includes("pnpm")) {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "Error: Please use 'pnpm' for all operations in this project. npm and yarn are not allowed."
  );
  process.exit(1);
}
