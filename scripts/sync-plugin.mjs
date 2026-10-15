import { copyFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = process.cwd();
const LOCAL_ENV_PATH = path.join(PROJECT_ROOT, ".env.local");
const RELEASE_ASSETS = ["manifest.json", "main.js", "styles.css"];

function parseEnvFile(contents) {
  return contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .reduce((env, line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return env;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const unquotedValue =
        rawValue.startsWith("\"") && rawValue.endsWith("\"")
          ? rawValue.slice(1, -1)
          : rawValue.startsWith("'") && rawValue.endsWith("'")
            ? rawValue.slice(1, -1)
            : rawValue;

      env[key] = unquotedValue;

      return env;
    }, {});
}

async function loadLocalEnv() {
  try {
    const contents = await readFile(LOCAL_ENV_PATH, "utf8");

    return parseEnvFile(contents);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function ensureDirectory(directoryPath, errorMessage) {
  let directoryStats;

  try {
    directoryStats = await stat(directoryPath);
  } catch {
    throw new Error(errorMessage);
  }

  if (!directoryStats.isDirectory()) {
    throw new Error(errorMessage);
  }
}

async function main() {
  const localEnv = await loadLocalEnv();
  const pluginDirectory = localEnv.OBSIDIAN_PLUGIN_DIR ?? process.env.OBSIDIAN_PLUGIN_DIR;

  if (!pluginDirectory) {
    throw new Error(
      "Missing OBSIDIAN_PLUGIN_DIR. Create .env.local from .env.local.example and set it to your local Obsidian plugin folder."
    );
  }

  const manifestPath = path.join(PROJECT_ROOT, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const resolvedPluginDirectory = path.resolve(PROJECT_ROOT, pluginDirectory);
  const pluginDirectoryMarker = `${path.sep}.obsidian${path.sep}plugins${path.sep}`;

  if (!resolvedPluginDirectory.includes(pluginDirectoryMarker)) {
    throw new Error(
      `Invalid OBSIDIAN_PLUGIN_DIR: ${resolvedPluginDirectory}. Expected a path inside <vault>/.obsidian/plugins/.`
    );
  }

  if (path.basename(resolvedPluginDirectory) !== manifest.id) {
    throw new Error(
      `Invalid OBSIDIAN_PLUGIN_DIR: ${resolvedPluginDirectory}. Expected the final folder name to match the plugin id "${manifest.id}".`
    );
  }

  await ensureDirectory(
    resolvedPluginDirectory,
    `Plugin directory does not exist: ${resolvedPluginDirectory}. Create or verify the target folder before syncing.`
  );

  for (const assetName of RELEASE_ASSETS) {
    const sourcePath = path.join(PROJECT_ROOT, assetName);
    const destinationPath = path.join(resolvedPluginDirectory, assetName);

    await stat(sourcePath);
    await copyFile(sourcePath, destinationPath);
    console.log(`Synced ${assetName} -> ${destinationPath}`);
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Plugin sync failed: ${message}`);
  process.exit(1);
}
