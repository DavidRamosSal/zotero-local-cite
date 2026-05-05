import fs from "node:fs/promises";
import path from "node:path";

const pluginId = "zotero-local-cite";
const vaultRoot = process.argv[2];

if (!vaultRoot) {
  console.error("Usage: npm run install:test-vault -- /path/to/your/vault");
  process.exit(1);
}

const pluginDir = path.join(vaultRoot, ".obsidian", "plugins", pluginId);
const distDir = path.join(process.cwd(), "dist");

await fs.mkdir(pluginDir, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
  await fs.copyFile(path.join(distDir, file), path.join(pluginDir, file));
}

console.log(`Installed ${pluginId} to ${pluginDir}`);
