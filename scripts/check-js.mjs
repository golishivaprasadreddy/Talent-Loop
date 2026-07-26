import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ignored = new Set([".git", ".next", "node_modules"]);
const files = [];

function collect(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path);
    else if (/\.(js|mjs)$/.test(entry)) files.push(path);
  }
}

collect(process.cwd());

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Checked ${files.length} JavaScript files.`);
