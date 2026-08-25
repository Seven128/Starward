import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const [mode, relativePath, pointer, expected, rootArgument] = process.argv.slice(2);
if (!mode || !relativePath || !expected) throw new Error("usage: node oracle.mjs <whole_resource|json_pointer> <path> <pointer-or-dot> <expected> [root]");
const root = resolve(rootArgument || process.cwd());
const bytes = await readFile(resolve(root, ...relativePath.split("/")));
let actual;
if (mode === "whole_resource") actual = createHash("sha256").update(bytes).digest("hex");
else if (mode === "json_pointer") { let value = JSON.parse(bytes.toString("utf8")); for (const part of pointer.slice(1).split("/").map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) value = value[part]; actual = String(value); }
else throw new Error("unsupported mode");
const result = { oracle: "starward-sky-canvas-operations-constraint-oracle@1.0.0", method: "asset_integrity", comparator: "asset_equal", actual, expected, pass: actual === expected };
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
if (!result.pass) process.exitCode = 1;
