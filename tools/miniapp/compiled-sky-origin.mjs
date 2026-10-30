import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fail, sha256 } from "./release-bundle-request.mjs";

export const REQUIRED_COMPILED_RUNTIME_CHUNKS = Object.freeze(["runtime.js", "common.js"]);

/** Evaluate the compiled pure address owner using this very bundle's webpack
 * runtime, without launching App/pages or supplying native/network APIs. IDs
 * and export names may be minified; the owner is located by its two public
 * validation errors, then its observable address/cache/header roles are checked.
 * Address selection may live in Sky while the pure credential selector remains
 * shared with startup's encoded-file owner. Neither requires native APIs.
 * Unsupported/missing/duplicate owners fail closed rather than falling back
 * to URL text anywhere in the bundle. This is compiled binding evidence only. */
export async function verifyCompiledSkyOrigin(request, fingerprint, root) {
  const pins = [];
  const sources = [];
  for (const file of [...REQUIRED_COMPILED_RUNTIME_CHUNKS, "sky/sub-vendors.js"]) {
    const record = fingerprint.files.find(candidate => candidate.path === file);
    if (!record && file === "sky/sub-vendors.js") continue;
    if (!record) fail("release_bundle_compiled_sky_runtime_missing");
    const bytes = await readFile(path.join(root, file));
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) fail("release_bundle_compiled_sky_bytes_changed");
    pins.push({ path: file, bytes: bytes.length, sha256: record.sha256 }); sources.push(bytes.toString("utf8"));
  }
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  const run = source => vm.runInContext(source, context, { timeout: 1000 });
  let result;
  try {
    run("globalThis.wx = { webpackJsonp: [] };");
    // Register the common chunk before loading its runtime so an unexpected
    // entry callback cannot run unrelated application modules during checking.
    for (const source of sources.slice(1)) run(source);
    run(`if (wx.webpackJsonp.length !== ${sources.length - 1} || wx.webpackJsonp.some(function(chunk) {
      return chunk.length !== 2 || typeof chunk[1] !== "object";
    })) throw Error("unsupported_pure_owner_chunk");`);
    run(sources[0]);
    // Use the bundle's actual registration/resolution code. Keep only the
    // two pure owners (or the legacy combined owner); unexpected dependencies
    // cannot execute unrelated application/native modules during this check.
    run(`wx.webpackJsonp.push([["starward-compiled-origin-check"], {}, function(require) { globalThis.skyRequire = require; }]);
      const owners = Object.entries(skyRequire.m).filter(function(entry) {
        const code = entry[1].toString();
        return code.includes("sky_public_resource_origin_invalid") && code.includes("sky_public_resource_path_invalid");
      });
      if (owners.length !== 1) throw Error("owner_not_unique");
      globalThis.skyOwnerId = owners[0][0];
      const previews = Object.entries(skyRequire.m).filter(function(entry) {
        return entry[1].toString().includes("sky_public_resource_preview_url_invalid");
      });
      if (previews.length > 1) throw Error("preview_owner_not_unique");
      globalThis.skyPreviewOwnerId = previews.length ? previews[0][0] : skyOwnerId;
      for (const id of Object.keys(skyRequire.m)) if (id !== skyOwnerId && id !== skyPreviewOwnerId) delete skyRequire.m[id];
      globalThis.skyOwner = skyRequire(skyOwnerId);
      globalThis.skyPreviewOwner = skyRequire(skyPreviewOwnerId);`);
    const input = { api: request.apiOrigin, resource: request.skyResourceOrigin ?? request.apiOrigin };
    result = JSON.parse(run(`(function() {
      const input = ${JSON.stringify(input)};
      const functions = Object.values(skyOwner).filter(function(value) { return typeof value === "function"; });
      const previewFunctions = Object.values(skyPreviewOwner).filter(function(value) { return typeof value === "function"; });
      const metadata = "/v2/sky/prepared-optical/" + "a".repeat(64) + "/manifest";
      const bitmap = "/v2/sky/prepared-optical/" + "a".repeat(64) + "/overview.png";
      const legacy = "/v2/sky/deep-sky/" + "b".repeat(64) + "/manifest";
      const sao = "/v2/sky/supplements/sao/v2/" + "c".repeat(64) + "/tiles/1.json";
      const discovery = "/v2/sky/prepared-optical/manifest";
      const call = function(fn, value) { try { return { value: fn(value) }; } catch { return { rejected: true }; } };
      const same = function(result, expected) { return !result.rejected && result.value === expected; };
      const noHeaders = function(result) { return !result.rejected && result.value &&
        typeof result.value === "object" && Object.keys(result.value).length === 0; };
      const has = function(check) { return functions.some(check); };
      const roles = {
        publishedOrigin: has(function(fn) { return same(call(fn), input.resource); }),
        environmentIdentity: has(function(fn) { return same(call(fn), input.api === input.resource ? input.api : input.api + "\\n" + input.resource); }),
        pathOrigin: has(function(fn) { return same(call(fn, discovery), input.api) && same(call(fn, legacy), input.api) &&
          same(call(fn, metadata), input.resource) && same(call(fn, bitmap), input.resource) && same(call(fn, sao), input.resource); }),
        publishedUrl: has(function(fn) { return same(call(fn, metadata), input.resource + metadata) &&
          same(call(fn, bitmap), input.resource + bitmap) && same(call(fn, sao), input.resource + sao) &&
          same(call(fn, legacy), input.api + legacy) && call(fn, discovery).rejected && call(fn, "/v2/sky/prepared-optical/" + "a".repeat(64) + "/../invalid").rejected; }),
        previewCredentialAbsent: previewFunctions.some(function(fn) { return noHeaders(call(fn, input.api + discovery)) &&
          noHeaders(call(fn, input.resource + bitmap)); }),
      };
      return JSON.stringify({ ownerId: skyOwnerId, previewOwnerId: skyPreviewOwnerId, roles });
    })()`));
  } catch { fail("release_bundle_compiled_sky_owner_unavailable"); }
  if (!result.roles || Object.values(result.roles).some(value => value !== true)) fail("release_bundle_compiled_sky_origin_mismatch");
  return Object.freeze({ schemaVersion: "starward-compiled-sky-origin-v1", scope: "COMPILED_PURE_ADDRESS_OWNER",
    ownerId: result.ownerId, previewOwnerId: result.previewOwnerId, roles: result.roles, pins });
}
