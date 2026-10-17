import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { uploadSkyObjectStore } from "./sky-object-store-upload.mjs";
import { preparedObjectStoreFixture } from "./sky-object-store-test-support.mjs";
import { ossFixtureCredentials, skyOssOracle } from "./sky-oss-test-oracle.mjs";
import { readPlainSkyFile } from "./sky-static-bundle.mjs";

async function rows(result) {
  return (await readFile(result.receiptPath, "utf8")).trim().split("\n").map(line => JSON.parse(line));
}
async function prepared(t, oracleOptions) {
  const f = await preparedObjectStoreFixture(t), oracle = await skyOssOracle(t, oracleOptions);
  const run = extra => uploadSkyObjectStore({ ...f.uploadArgs, clientFactory: oracle.factory, ...extra });
  return { ...f, oracle, run };
}

async function seedOracle(f) {
  const plan = JSON.parse(await readFile(path.join(f.prepared.directory, "plan.json"), "utf8"));
  for (const object of plan.objects) f.oracle.objects.set(object.objectKey, {
    bytes: await readPlainSkyFile(f.delivery.directory, object.sourcePath),
    headers: { ...Object.fromEntries(Object.entries(object.uploadHeaders).filter(([name]) => name !== "x-oss-forbid-overwrite")), "content-length": String(object.bytes) },
  });
  return plan;
}

test("actual OSS SDK cold upload and warm resume verify exact native keys, metadata, MD5 and all bytes", async t => {
  const f = await prepared(t), cold = await f.run();
  assert.equal(cold.status, "VERIFIED_OSS_OBJECTS"); assert.equal(cold.verifiedFiles, 3); assert.equal(cold.putAttempts, 3);
  assert.equal(cold.remainingFiles, 0); assert.equal(cold.cdnAcceptanceAndCapacity, "UNVERIFIED");
  assert.equal(f.oracle.puts, 3);
  const plan = JSON.parse(await readFile(path.join(f.prepared.directory, "plan.json"), "utf8"));
  for (const object of plan.objects) {
    const remote = f.oracle.objects.get(object.objectKey);
    assert.ok(remote.bytes.equals(await readPlainSkyFile(f.delivery.directory, object.sourcePath)));
    assert.equal(remote.headers["x-oss-meta-starward-content-sha256"], object.sha256);
    assert.ok(!object.objectKey.endsWith(".tile"));
  }
  const coldRows = await rows(cold);
  assert.equal(coldRows[0].authority, "ORIGINAL_HELD_OCI_PREPARATION");
  assert.equal(coldRows.filter(row => row.event === "OBJECT_VERIFIED").length, 3);
  assert.equal(coldRows.at(-1).status, "VERIFIED_OSS_OBJECTS");
  const before = f.oracle.trace.length, warm = await f.run();
  assert.equal(warm.status, "VERIFIED_OSS_OBJECTS"); assert.equal(warm.putAttempts, 0); assert.equal(f.oracle.puts, 3);
  assert.equal(f.oracle.trace.slice(before).filter(event => event.method === "GET" && !event.versioning).length, 3);
  assert.ok(warm.results.every(result => result.outcome === "RETAINED_EXACT_EXISTING"));
  assert.notEqual(warm.receiptPath, cold.receiptPath);
  assert.ok(f.oracle.trace.every(event => event.authorizationV4 && event.authorizationPresent && !event.previewHeaderPresent));
  assert.ok(f.oracle.trace.filter(event => ["GET", "HEAD"].includes(event.method) && !event.versioning).every(event => event.acceptEncoding === "identity"));
  assert.ok(!JSON.stringify(coldRows).includes("STARWARD_LOCAL_FIXTURE_SECRET"));
});

test("copied, disposed or foreign source preparation cannot authorize any OSS request", async t => {
  const f = await prepared(t);
  await assert.rejects(f.run({ delivery: { ...f.delivery } }), /release_preparation_invalid/u);
  assert.equal(f.oracle.trace.length, 0);
  await writeFile(f.uploadArgs.deployEnvPath, "fixture=changed\n");
  await assert.rejects(f.run(), /release_preparation_changed/u);
  assert.equal(f.oracle.trace.length, 0);
  await writeFile(f.uploadArgs.deployEnvPath, "fixture=original\n");
  await f.delivery.dispose();
  await assert.rejects(f.run(), /release_preparation_invalid/u);
  assert.equal(f.oracle.trace.length, 0);
});

test("Enabled, Suspended and unknown bucket states stop before PUT without altering the bucket", async t => {
  const f = await prepared(t);
  for (const state of ["Enabled", "Suspended", "", "Unknown"]) {
    f.oracle.setVersionStatus(state);
    const result = await f.run();
    assert.equal(result.status, "FAILED"); assert.equal(result.code, "sky_object_store_versioning_invalid");
    assert.equal(result.verifiedFiles, 0); assert.equal(result.putAttempts, 0);
    assert.equal(f.oracle.puts, 0);
  }
  assert.ok(f.oracle.trace.every(event => event.versioning && event.method === "GET"));
});

test("lost PUT response is reconciled by actual remote readback with no duplicate PUT", async t => {
  const f = await prepared(t, { afterPut: ({ response }) => { response.destroy(); return true; } });
  const result = await f.run();
  assert.equal(result.status, "VERIFIED_OSS_OBJECTS"); assert.equal(f.oracle.puts, 3);
  assert.ok(result.results.every(row => row.outcome === "RECONCILED_AFTER_PUT_ERROR"));
});

test("partial failure retains verified objects and the next run rechecks them before completing missing keys", async t => {
  let failSecond = true, seen = 0;
  const f = await prepared(t, { beforeRequest: ({ request, response, event }) => {
    if (request.method === "HEAD" && !event.versioning && ++seen === 3 && failSecond) {
      response.writeHead(503); response.end(); return true;
    }
    return false;
  } });
  const first = await f.run();
  assert.equal(first.status, "FAILED"); assert.equal(first.verifiedFiles, 1); assert.equal(first.remainingFiles, 2);
  assert.equal(f.oracle.puts, 1);
  const firstRows = await rows(first);
  assert.equal(firstRows.filter(row => row.event === "OBJECT_VERIFIED").length, 1);
  assert.equal(firstRows.at(-1).status, "FAILED");
  failSecond = false; const resumed = await f.run();
  assert.equal(resumed.status, "VERIFIED_OSS_OBJECTS"); assert.equal(resumed.putAttempts, 2); assert.equal(f.oracle.puts, 3);
  assert.equal(resumed.results[0].outcome, "RETAINED_EXACT_EXISTING");
  assert.deepEqual(await rows(first), firstRows);
});

test("actual SDK 200 with malformed/unrelated version XML cannot authorize a write", async t => {
  for (const xml of ["<Unrelated/>", "<VersioningConfiguration><Unknown/></VersioningConfiguration>", "<VersioningConfiguration>"]) {
    await t.test(xml, async child => {
      const f = await prepared(child, { versionXml: xml }), result = await f.run();
      assert.equal(result.status, "FAILED"); assert.equal(result.putAttempts, 0); assert.equal(f.oracle.puts, 0);
      assert.equal(f.oracle.trace.length, 1);
    });
  }
});

test("existing immutable byte, header and stored metadata discrepancies reject without overwriting", async t => {
  for (const [name, mutate, expected] of [
    ["same-length changed bytes", object => { object.bytes = Buffer.alloc(object.bytes.length, 1); }, "sky_object_store_remote_identity_mismatch"],
    ["missing digest metadata", object => { assert.ok(object.headers["x-oss-meta-starward-content-sha256"]); delete object.headers["x-oss-meta-starward-content-sha256"]; }, "sky_object_store_remote_metadata_mismatch"],
    ["changed cache lifetime", object => { object.headers["cache-control"] = "public, max-age=1"; }, "sky_object_store_remote_metadata_mismatch"],
    ["extra disposition", object => { object.headers["content-disposition"] = "attachment"; }, "sky_object_store_remote_metadata_mismatch"],
    ["extra provider metadata", object => { object.headers["x-oss-meta-x-starward-unknown"] = "wrong"; }, "sky_object_store_remote_metadata_mismatch"],
    ["stored encoding", object => { object.headers["content-encoding"] = "gzip"; }, "sky_object_store_remote_metadata_mismatch"],
    ["versioned object", object => { object.headers["x-oss-version-id"] = "fixture-version-id"; }, "sky_object_store_remote_metadata_mismatch"],
  ]) await t.test(name, async child => {
    const f = await prepared(child), plan = await seedOracle(f), first = f.oracle.objects.get(plan.objects[0].objectKey);
    mutate(first); const original = Buffer.from(first.bytes), result = await f.run();
    assert.equal(result.status, "FAILED"); assert.equal(result.code, expected); assert.equal(f.oracle.puts, 0);
    assert.ok(first.bytes.equals(original)); assert.equal(result.verifiedFiles, 0);
  });
});

test("a concurrent creator is accepted only after exact conflict readback and receives no overwrite", async t => {
  let objectsToRace;
  const f = await prepared(t, { beforeRequest: async ({ request, key, objects }) => {
    if (request.method === "PUT") {
      const object = objectsToRace.get(key);
      objects.set(key, { bytes: Buffer.from(object.bytes), headers: { ...object.headers } });
    }
    return false;
  } });
  await seedOracle(f); objectsToRace = new Map(f.oracle.objects); f.oracle.objects.clear();
  const result = await f.run();
  assert.equal(result.status, "VERIFIED_OSS_OBJECTS"); assert.equal(f.oracle.puts, 3);
  assert.ok(result.results.every(row => row.outcome === "RECONCILED_AFTER_PUT_ERROR"));
});

test("ambiguous failed PUT with no remote object stops and is rechecked on a separate run", async t => {
  let drop = true;
  const f = await prepared(t, { afterPut: ({ response, key, objects }) => {
    if (!drop) return false;
    objects.delete(key); response.destroy(); return true;
  } });
  const failed = await f.run();
  assert.equal(failed.status, "FAILED"); assert.equal(failed.code, "sky_object_store_put_result_missing");
  assert.equal(failed.putAttempts, 1); assert.equal(f.oracle.puts, 1); assert.equal(failed.verifiedFiles, 0);
  drop = false; const recovered = await f.run();
  assert.equal(recovered.status, "VERIFIED_OSS_OBJECTS"); assert.equal(recovered.putAttempts, 3); assert.equal(f.oracle.puts, 4);
});

test("bucket state changed before the next write stops with earlier verified objects retained", async t => {
  let changed = false, f;
  f = await prepared(t, { beforeRequest: ({ request, event }) => {
    if (!changed && request.method === "GET" && !event.versioning) {
      changed = true; f.oracle.setVersionStatus("Enabled");
    }
    return false;
  } });
  const result = await f.run();
  assert.equal(result.status, "FAILED"); assert.equal(result.code, "sky_object_store_versioning_invalid");
  assert.equal(result.verifiedFiles, 1); assert.equal(result.putAttempts, 1); assert.equal(f.oracle.puts, 1);
  assert.equal((await rows(result)).filter(row => row.event === "OBJECT_VERIFIED").length, 1);
});

test("a changed deployment descriptor or source lease blocks subsequent missing-object PUTs", async t => {
  for (const change of ["descriptor", "lease"]) await t.test(change, async child => {
    let changed = false, f;
    f = await prepared(child, { beforeRequest: async ({ request, event }) => {
      if (!changed && request.method === "GET" && !event.versioning) {
        changed = true;
        if (change === "lease") await f.delivery.dispose();
        else await writeFile(f.uploadArgs.deployEnvPath, "fixture=changed\n");
      }
      return false;
    } });
    const result = await f.run();
    assert.equal(result.status, "FAILED"); assert.equal(result.verifiedFiles, 1); assert.equal(f.oracle.puts, 1);
    assert.match(result.code, /sky_static_release_preparation_(?:invalid|changed)/u);
  });
});

test("cancelling an actual SDK body closes its owned connection and preserves an aborted receipt", async t => {
  const controller = new AbortController(); let bodyStarted;
  const ready = new Promise(resolve => { bodyStarted = resolve; });
  const f = await prepared(t, { getBody: ({ response, object }) => { response.write(object.bytes.subarray(0, 1)); bodyStarted(); } });
  await seedOracle(f);
  const operation = f.run({ signal: controller.signal }); await ready; controller.abort();
  const result = await operation;
  assert.equal(result.status, "ABORTED"); assert.equal(result.code, "sky_object_store_aborted");
  assert.equal(result.putAttempts, 0); assert.equal(result.verifiedFiles, 0);
  assert.equal((await rows(result)).at(-1).status, "ABORTED");
  assert.equal(f.oracle.puts, 0);
});

test("whole-request deadline stops periodically active actual SDK bodies rather than leaving them in flight", async t => {
  const f = await prepared(t, { requestTimeout: 120, getBody: ({ response }) => {
    const timer = setInterval(() => response.write(Buffer.from([1])), 40);
    response.once("close", () => clearInterval(timer));
  } });
  await seedOracle(f);
  const before = Date.now(), result = await f.run();
  assert.equal(result.status, "FAILED"); assert.equal(result.code, "sky_oss_request_timeout");
  assert.ok(Date.now() - before < 2000); assert.equal(f.oracle.puts, 0);
});

test("changed source bytes are rejected immediately before PUT while previously verified objects remain", async t => {
  let changed = false, f, plan;
  f = await prepared(t, { beforeRequest: async ({ request, event }) => {
    if (!changed && request.method === "GET" && !event.versioning) {
      changed = true;
      const next = plan.objects[1];
      await writeFile(path.join(f.delivery.directory, next.sourcePath), Buffer.alloc(next.bytes, 3));
    }
    return false;
  } });
  plan = JSON.parse(await readFile(path.join(f.prepared.directory, "plan.json"), "utf8"));
  const result = await f.run();
  assert.equal(result.status, "FAILED"); assert.equal(result.code, "sky_object_store_source_changed");
  assert.equal(result.verifiedFiles, 1); assert.equal(f.oracle.puts, 1);
});

test("remote GET metadata is checked independently of a successful HEAD", async t => {
  const f = await prepared(t, { beforeRequest: ({ request, event, key, objects }) => {
    if (request.method === "GET" && !event.versioning) objects.get(key).headers["cache-control"] = "private";
    return false;
  } });
  await seedOracle(f); const result = await f.run();
  assert.equal(result.status, "FAILED"); assert.equal(result.code, "sky_object_store_remote_metadata_mismatch");
  assert.equal(result.putAttempts, 0); assert.equal(f.oracle.puts, 0);
});

test("bounded mutation detects the escaped defect of treating unrelated 200 XML as a never-versioned bucket", async t => {
  const f = await prepared(t, { versionXml: "<Unrelated/>" });
  const strict = await f.run();
  assert.equal(strict.status, "FAILED"); assert.equal(strict.putAttempts, 0);
  const filename = new URL("./sky-oss-client.mjs", import.meta.url), source = await readFile(filename, "utf8");
  const start = source.indexOf("      // ali-oss omits Status"), end = source.indexOf("      return { status: 200, versionStatus: result.versionStatus };", start);
  assert.ok(start > 0 && end > start);
  const runtime = new URL("./oss-runtime/package.json", import.meta.url).href;
  const mutant = (source.slice(0, start) + source.slice(end)).replace(
    'new URL("./oss-runtime/package.json", import.meta.url)', `new URL(${JSON.stringify(runtime)})`);
  const file = path.join(f.root, "bounded-mutant-client.mjs"); await writeFile(file, mutant);
  const module = await import(pathToFileURL(file).href);
  const result = await f.run({ clientFactory: config => module.createSkyOssClient({ ...config, credentials: ossFixtureCredentials }, { sdkFactory: f.oracle.sdkFactory }) });
  // This is the same real SDK, source lease and remote byte check. Removing
  // only the raw-version-response guard now permits all three PUTs, so the
  // required zero-write assertion would fail against this bounded mutation.
  assert.equal(result.status, "VERIFIED_OSS_OBJECTS"); assert.equal(result.putAttempts, 3);
  assert.equal(await readFile(filename, "utf8"), source);
});
