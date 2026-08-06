import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [relativePath, expectedSha256, rootArgument] = process.argv.slice(2);
if (!relativePath || !/^[a-f0-9]{64}$/.test(expectedSha256 || "")) {
  throw new Error("usage: node frozen-oracle.mjs <repository-relative-path> <expected-sha256> [repository-root]");
}
const root = resolve(rootArgument || process.cwd());
const bytes = await readFile(resolve(root, ...relativePath.split("/")));
const actualSha256 = createHash("sha256").update(bytes).digest("hex");
const result = {
  oracle: "starward-dra-asset-integrity-oracle@1.0.0",
  method: "asset_integrity",
  comparator: "asset_equal",
  path: relativePath,
  expected_sha256: expectedSha256,
  actual_sha256: actualSha256,
  pass: actualSha256 === expectedSha256,
};
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
if (!result.pass) process.exitCode = 1;
