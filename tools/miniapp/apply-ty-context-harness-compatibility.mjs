import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const packageRoot = path.join(
  root,
  "node_modules",
  "project-tiny-context-harness",
);
const checkOnly = process.argv.slice(2).includes("--check");
const expectedVersion = "0.8.16";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function occurrenceCount(value, needle) {
  return value.split(needle).length - 1;
}

async function ensureKnownReplacement({
  relativePath,
  original,
  replacement,
  expectedOccurrences,
}) {
  const target = path.join(packageRoot, ...relativePath.split("/"));
  const before = await readFile(target, "utf8");
  const originalCount = occurrenceCount(before, original);
  const replacementCount = occurrenceCount(before, replacement);
  let after = before;
  let disposition;

  if (
    originalCount === expectedOccurrences &&
    replacementCount === 0
  ) {
    if (checkOnly)
      throw new Error(
        `ty_context_harness_compatibility_not_applied:${relativePath}`,
      );
    after = before.split(original).join(replacement);
    disposition = "applied";
  } else if (
    originalCount === 0 &&
    replacementCount === expectedOccurrences
  ) {
    disposition = "already_applied";
  } else {
    throw new Error(
      `ty_context_harness_compatibility_unknown_source_shape:${relativePath}:${originalCount}:${replacementCount}`,
    );
  }

  if (after !== before) await writeFile(target, after, "utf8");
  const readback = await readFile(target, "utf8");
  if (
    occurrenceCount(readback, original) !== 0 ||
    occurrenceCount(readback, replacement) !== expectedOccurrences
  )
    throw new Error(
      `ty_context_harness_compatibility_readback_failed:${relativePath}`,
    );
  return {
    file: relativePath,
    disposition,
  };
}

const packageJson = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);
if (packageJson.version !== expectedVersion)
  throw new Error(
    `ty_context_harness_compatibility_version_mismatch:${packageJson.version ?? "missing"}:${expectedVersion}`,
  );

const results = [];
results.push(
  await ensureKnownReplacement({
    relativePath: "dist/lib/long-task-workspace-snapshot.js",
    original: "rm(temporary, { recursive: true, force: true })",
    replacement:
      "rm(temporary, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })",
    expectedOccurrences: 3,
  }),
);
results.push(
  await ensureKnownReplacement({
    relativePath: "dist/lib/long-task-counterfactual-sandbox.js",
    original:
      'const REMOVE_RETRY_LIMIT = process.platform === "win32" ? 6 : 2;',
    replacement:
      'const REMOVE_RETRY_LIMIT = process.platform === "win32" ? 20 : 2;',
    expectedOccurrences: 1,
  }),
);
results.push(
  await ensureKnownReplacement({
    relativePath: "dist/lib/long-task-counterfactual-sandbox.js",
    original: "const REMOVE_RETRY_DELAY_MS = 100;",
    replacement: "const REMOVE_RETRY_DELAY_MS = 250;",
    expectedOccurrences: 1,
  }),
);

const finalFiles = await Promise.all(
  [...new Set(results.map((result) => result.file))].map(async (file) => ({
    file,
    sha256: sha256(
      await readFile(path.join(packageRoot, ...file.split("/"))),
    ),
  })),
);

process.stdout.write(
  `${JSON.stringify({
    status: "passed",
    mode: checkOnly ? "check" : "apply",
    package: `project-tiny-context-harness@${expectedVersion}`,
    purpose:
      "bounded retry for transient Windows locks on exact Harness-owned temporary roots",
    acceptance_semantics_changed: false,
    operations: results,
    files: finalFiles,
  })}\n`,
);
