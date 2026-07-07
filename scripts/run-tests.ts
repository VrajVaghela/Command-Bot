import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Node's built-in test runner (`node --test`) only auto-discovers .js/.mjs/.cjs
 * files, never .ts, even with a loader like tsx registered (code_standards.md
 * §9 "keep it runnable with npm test" — no vitest/jest added since neither is
 * already a dependency and this avoids a network install). This walks `src/`
 * ourselves and passes explicit file paths, which sidesteps that gap and any
 * cross-shell glob differences (this repo is worked on from Windows).
 */
function findTestFiles(dir: string, suffix: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findTestFiles(full, suffix));
    } else if (entry.endsWith(suffix)) {
      found.push(full);
    }
  }
  return found;
}

const integration = process.argv.includes("--integration");
const suffix = integration ? ".itest.ts" : ".test.ts";
const envFile = integration ? ".env.local" : ".env.test";

const files = findTestFiles("src", suffix);
if (files.length === 0) {
  console.log(`No ${suffix} files found under src/.`);
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    // Every server module starts with `import "server-only"`, which
    // unconditionally throws unless resolved under the "react-server"
    // condition (that's how Next's RSC bundler no-ops it). None of the
    // modules under test import React, so this is safe here.
    "--conditions=react-server",
    `--env-file=${envFile}`,
    "--test",
    ...files,
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
