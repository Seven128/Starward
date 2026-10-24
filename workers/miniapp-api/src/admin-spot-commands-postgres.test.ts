import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { PoolClient } from "pg";
import { AdminController } from "./admin.controller.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { MiniappService } from "./miniapp-service.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

const databaseUrl = process.env.ADMIN_SPOT_COMMAND_TEST_DATABASE_URL;
const beforeCredentials = process.env.MINIAPP_ADMIN_CREDENTIALS;
let repository: PostgresMiniappRepository;
let app: Awaited<ReturnType<typeof NestFactory.create>>;
let adapter: FastifyAdapter;
let apiBase: string;
let failCache = false;
const invalidations: string[] = [];
const actorId = "admin:spot-command-owner";
const credential = (actor: string, token: string, role: string) => ({ actorId: actor,
  tokenSha256: createHash("sha256").update(token).digest("hex"), roles: [role] });

async function openApplication() {
  repository = await new PostgresMiniappRepository(databaseUrl!).initialize({ migrate: true });
  const service = { repository, cache: { deleteByPrefix: async (prefix: string) => {
    invalidations.push(prefix);
    if (failCache) throw new Error("NOPERM synthetic post-commit cache denial");
  } } };
  class TestModule {}
  Module({ controllers: [AdminController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  adapter = new FastifyAdapter({ logger: false });
  app = await NestFactory.create(TestModule, adapter, { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  await adapter.getInstance().ready();
  await app.listen(0, "127.0.0.1");
  apiBase = await app.getUrl();
}

before(async () => {
  if (!databaseUrl) return;
  const target = new URL(databaseUrl);
  assert.equal(target.hostname, "127.0.0.1");
  assert.match(target.pathname, /^\/starward_(?:admin_spot_[a-f0-9]+|verify_[a-f0-9]{16})$/u);
  assert.ok(target.port);
  process.env.MINIAPP_ADMIN_CREDENTIALS = JSON.stringify([
    credential(actorId, "synthetic-owner", "OWNER"),
    credential("admin:spot-command-auditor", "synthetic-auditor", "AUDITOR"),
  ]);
  await openApplication();
});

after(async () => {
  if (app) await app.close();
  if (repository) await repository.close();
  if (beforeCredentials === undefined) delete process.env.MINIAPP_ADMIN_CREDENTIALS;
  else process.env.MINIAPP_ADMIN_CREDENTIALS = beforeCredentials;
});

function candidate() {
  const id = randomUUID();
  return {
    name: `Isolated candidate ${id}`, region: "Synthetic region", address: "Synthetic address",
    timezone: "Asia/Shanghai", latitude: 22.54, longitude: 114.06, altitudeM: null,
    visibilityPolicy: "PUBLIC_EXACT",
    source: { id: `source:admin-spot-${id}`, kind: "USER_FIELD_REPORT", provider: "Isolated command test",
      title: "Synthetic candidate source", sourceUrl: "", license: "Synthetic data, not publishable",
      licenseUrl: "", publishedAt: null, retrievedAt: new Date().toISOString(), validFrom: null,
      validTo: null, state: "FRESH", confidence: null, precision: "Transaction verification only",
      limitations: ["Not a real place assertion"] },
    reason: "Verify isolated durable command effect",
  };
}

function submit(method: "POST" | "PATCH", route: string, payload: Record<string, unknown>, key?: string,
  token = "synthetic-owner", actor?: string) {
  const commandRoute = key === undefined ? route : route === "spots" ? "spots/candidate-commands"
    : method === "PATCH" && /^spots\/[^/]+$/u.test(route) ? `${route}/commands` : route;
  return adapter.getInstance().inject({ method, url: `/v2/admin/${commandRoute}`, payload,
    headers: { "x-admin-token": token, ...(key === undefined ? {} : { "idempotency-key": key }),
      ...(actor === undefined ? {} : { "x-admin-actor": actor }) } });
}

async function newLegacyCandidate() {
  const response = await submit("POST", "spots", candidate());
  assert.equal(response.statusCode, 201);
  return response.json().data.detail.spot.spotId as string;
}

async function spotState(spotId: string) {
  const response = await repository.pool.query(`SELECT s.version, s.name,
    (SELECT count(*)::int FROM spot_revisions r WHERE r.spot_id=s.spot_id) AS revisions,
    (SELECT count(*)::int FROM audit_logs a WHERE a.subject_id=s.spot_id AND a.action='SPOT_PATCH') AS patches,
    (SELECT count(*)::int FROM spot_verifications v WHERE v.spot_id=s.spot_id) AS verifications
    FROM spots s WHERE s.spot_id=$1`, [spotId]);
  return response.rows[0];
}

test("new command entries require key and revision while unkeyed legacy clients retain their saved-result shape", { skip: !databaseUrl }, async () => {
  const payload = candidate();
  assert.equal((await submit("POST", "spots/candidate-commands", payload)).statusCode, 400);
  assert.equal((await repository.pool.query("SELECT 1 FROM spots WHERE name=$1", [payload.name])).rowCount, 0);
  const invalidIdentity = { ...candidate(), spotId: [`spot:array-${randomUUID()}`] };
  assert.equal((await submit("POST", "spots", invalidIdentity, `invalid-id-${randomUUID()}`)).statusCode, 400,
    "a string-like array is not a supported spot identity");
  assert.equal((await repository.pool.query("SELECT 1 FROM spots WHERE name=$1", [invalidIdentity.name])).rowCount, 0);
  const legacy = await submit("POST", "spots", payload);
  assert.equal(legacy.statusCode, 201);
  assert.equal(legacy.json().data.receipt, undefined);
  const spotId = legacy.json().data.detail.spot.spotId;
  const patch = { name: "Legacy shape remains", reason: payload.reason };
  assert.equal((await submit("PATCH", `spots/${encodeURIComponent(spotId)}/commands`, { ...patch, expectedRevision: 1 })).statusCode, 400);
  assert.equal((await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, patch, `missing-revision-${randomUUID()}`)).statusCode, 409);
  assert.equal((await spotState(spotId)).version, 1);
  const oldPatch = await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, patch);
  assert.equal(oldPatch.statusCode, 200);
  assert.equal(oldPatch.json().data.spot.name, patch.name);
  assert.equal(oldPatch.json().data.receipt, undefined);
  assert.equal((await spotState(spotId)).version, 2);
});

test("same-key generated candidate creation has one durable effect under concurrent HTTP requests", { skip: !databaseUrl }, async () => {
  const payload = candidate(), key = `candidate-${randomUUID()}`;
  const responses = await Promise.all([submit("POST", "spots", payload, key), submit("POST", "spots", payload, key)]);
  assert.deepEqual(responses.map(response => response.statusCode), [201, 201]);
  const spots = await repository.pool.query("SELECT spot_id, version FROM spots WHERE name=$1", [payload.name]);
  assert.equal(spots.rows.length, 1, "a lost/repeated create must not generate a second spot ID");
  assert.equal(spots.rows[0].version, 1);
  const data = responses.map(response => response.json().data);
  assert.deepEqual(data.map(item => item.receipt.status).sort(), ["COMMITTED", "REPLAYED"]);
  assert.equal(data[0].receipt.receiptId, data[1].receipt.receiptId);
  assert.deepEqual(data[0].readback, data[1].readback);
  assert.equal(data[0].receipt.actorId, actorId);
  assert.equal(data[0].receipt.resultingRevision, 1);
  assert.equal(data[0].readback.detail.spot.spotId, spots.rows[0].spot_id);
  const effects = await repository.pool.query(`SELECT
    (SELECT count(*)::int FROM audit_logs WHERE subject_id=$1 AND action='SPOT_CANDIDATE_CREATE') AS audits,
    (SELECT count(*)::int FROM operation_receipts WHERE scope_id=$2 AND idempotency_key=$3) AS receipts,
    (SELECT count(*)::int FROM outbox_events WHERE idempotency_key=$4) AS events`,
  [spots.rows[0].spot_id, actorId, key, `${actorId}:${key}`]);
  assert.deepEqual(effects.rows[0], { audits: 1, receipts: 1, events: 1 });
  const changed = await submit("POST", "spots", { ...payload, reason: ` ${payload.reason} ` }, key);
  assert.equal(changed.statusCode, 409, "the full submitted input is bound even when normalization would erase its difference");
  const crossOperation = await submit("PATCH", `spots/${encodeURIComponent(spots.rows[0].spot_id)}`,
    { name: "Must not patch", reason: payload.reason, expectedRevision: 1 }, key);
  assert.equal(crossOperation.statusCode, 409);
  assert.equal((await spotState(spots.rows[0].spot_id)).version, 1);
});

test("same-key revisioned patch preserves one revision and known commit through cache failure", { skip: !databaseUrl }, async () => {
  const spotId = await newLegacyCandidate(), key = `patch-${randomUUID()}`;
  const payload = { name: "Durably changed once", reason: "Verify optimistic revision", expectedRevision: 1,
    wgs84: { latitude: 22.55, longitude: 114.07, source: candidate().source } };
  failCache = true;
  invalidations.length = 0;
  const responses = await Promise.all([submit("PATCH", `spots/${encodeURIComponent(spotId)}`, payload, key),
    submit("PATCH", `spots/${encodeURIComponent(spotId)}`, payload, key)]);
  failCache = false;
  assert.deepEqual(responses.map(response => response.statusCode), [200, 200]);
  assert.deepEqual(await spotState(spotId), { version: 2, name: payload.name, revisions: 2, patches: 1, verifications: 1 });
  for (const response of responses) {
    assert.equal(response.json().postCommit.cacheInvalidation, "FAILED");
    assert.equal(response.json().data.receipt.actorId, actorId);
  }
  assert.deepEqual([...new Set(invalidations)].sort(), ["favorites:", "map:", `spot-overview:${spotId}`].sort());
  const replay = await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, payload, key);
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.json().data.receipt.status, "REPLAYED");
  assert.equal(replay.json().postCommit.cacheInvalidation, "COMPLETE");
  assert.equal((await spotState(spotId)).version, 2);
  assert.equal((await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, { ...payload, expectedRevision: 2 }, key)).statusCode, 409);
  const staleKey = `stale-${randomUUID()}`;
  assert.equal((await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, payload, staleKey)).statusCode, 409);
  assert.equal((await repository.pool.query("SELECT 1 FROM operation_receipts WHERE scope_id=$1 AND idempotency_key=$2", [actorId, staleKey])).rowCount, 0);
  for (const [token, assertedActor] of [["synthetic-auditor", undefined], ["synthetic-auditor", actorId]] as const)
    assert.equal((await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, { ...payload, expectedRevision: 2 }, key, token, assertedActor)).statusCode, 403);
  assert.equal((await spotState(spotId)).version, 2);
  const nextPayload = { name: "First concurrent revision winner", reason: payload.reason, expectedRevision: 2 };
  const nextKeys = [`next-${randomUUID()}`, `next-${randomUUID()}`];
  const nextResponses = await Promise.all(nextKeys.map(nextKey => submit("PATCH", `spots/${encodeURIComponent(spotId)}`, nextPayload, nextKey)));
  assert.deepEqual(nextResponses.map(response => response.statusCode).sort(), [200, 409], "different commands cannot both overwrite the same expected revision");
  assert.deepEqual(await spotState(spotId), { version: 3, name: nextPayload.name, revisions: 3, patches: 2, verifications: 1 });
  assert.equal((await repository.pool.query("SELECT 1 FROM operation_receipts WHERE scope_id=$1 AND idempotency_key=ANY($2::text[])", [actorId, nextKeys])).rowCount, 1);
});

test("receipt insertion failure rolls back the actual patch and frees its same-key retry", { skip: !databaseUrl }, async () => {
  const spotId = await newLegacyCandidate(), key = `rollback-${randomUUID()}`;
  const payload = { name: "Only after recovery", reason: "Verify atomic receipt transaction", expectedRevision: 1 };
  const beforeState = await spotState(spotId);
  await repository.pool.query(`CREATE FUNCTION admin_spot_test_reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.operation='spot.patch' THEN RAISE EXCEPTION 'synthetic receipt unavailable'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER admin_spot_test_reject_receipt BEFORE INSERT ON operation_receipts
    FOR EACH ROW EXECUTE FUNCTION admin_spot_test_reject_receipt()`);
  try {
    assert.equal((await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, payload, key)).statusCode, 500);
    assert.deepEqual(await spotState(spotId), beforeState);
    for (const table of ["operation_receipts", "idempotency_records"])
      assert.equal((await repository.pool.query(`SELECT 1 FROM ${table} WHERE scope_id=$1 AND idempotency_key=$2`, [actorId, key])).rowCount, 0);
    assert.equal((await repository.pool.query("SELECT 1 FROM outbox_events WHERE idempotency_key=$1", [`${actorId}:${key}`])).rowCount, 0);
  } finally {
    await repository.pool.query("DROP TRIGGER admin_spot_test_reject_receipt ON operation_receipts; DROP FUNCTION admin_spot_test_reject_receipt()");
  }
  const recovered = await submit("PATCH", `spots/${encodeURIComponent(spotId)}`, payload, key);
  assert.equal(recovered.statusCode, 200);
  assert.equal(recovered.json().data.receipt.status, "COMMITTED");
  assert.equal((await spotState(spotId)).version, 2);
});

test("lost commit response replays after application restart without repeating candidate creation", { skip: !databaseUrl }, async () => {
  const payload = candidate(), key = `lost-${randomUUID()}`;
  const connect = repository.pool.connect.bind(repository.pool);
  let lost = false;
  repository.pool.connect = (async () => {
    const client = await connect();
    return new Proxy(client, { get(target, property) {
      if (property === "query") return async (...args: unknown[]) => {
        const result = await (target.query as (...values: unknown[]) => Promise<unknown>)(...args);
        if (args[0] === "COMMIT" && !lost) { lost = true; throw new Error("synthetic lost COMMIT acknowledgement"); }
        return result;
      };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    } }) as PoolClient;
  }) as typeof repository.pool.connect;
  try {
    assert.equal((await submit("POST", "spots", payload, key)).statusCode, 500);
    assert.equal(lost, true, "failure occurs after the actual PostgreSQL COMMIT");
  } finally { repository.pool.connect = connect as typeof repository.pool.connect; }
  await app.close();
  await repository.close();
  await openApplication();
  const replay = await submit("POST", "spots", payload, key);
  assert.equal(replay.statusCode, 201);
  assert.equal(replay.json().data.receipt.status, "REPLAYED");
  const spots = await repository.pool.query("SELECT spot_id FROM spots WHERE name=$1", [payload.name]);
  assert.equal(spots.rows.length, 1);
  assert.equal(replay.json().data.readback.detail.spot.spotId, spots.rows[0].spot_id);
  const audit = await repository.pool.query("SELECT actor_id FROM audit_logs WHERE subject_id=$1 AND action='SPOT_CANDIDATE_CREATE'", [spots.rows[0].spot_id]);
  assert.deepEqual(audit.rows, [{ actor_id: actorId }]);
});

test("real operator CLI carries the advertised contract, original key and revision through HTTP and PostgreSQL", { skip: !databaseUrl }, async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const directory = await mkdtemp(path.join(tmpdir(), "starward-admin-spot-command-"));
  const execute = promisify(execFile);
  const cli = async (args: readonly string[], base = apiBase) => {
    const result = await execute(process.execPath, ["tools/run-node.cjs", "tools/miniapp/admin-operations.mjs", ...args], {
      cwd: root, timeout: 30_000, maxBuffer: 64 * 1024, windowsHide: true,
      env: { ...process.env, MINIAPP_ADMIN_TOKEN: "synthetic-owner", MINIAPP_ADMIN_ACTOR: actorId, MINIAPP_ADMIN_BASE_URL: base },
    });
    return JSON.parse(result.stdout);
  };
  try {
    const source = candidate(), createPath = path.join(directory, "candidate.json"), patchPath = path.join(directory, "patch.json");
    await writeFile(createPath, JSON.stringify(source));
    await writeFile(patchPath, JSON.stringify({ name: "CLI persisted edit" }));
    const createArgs = ["candidate-create", "--input", createPath, "--reason", source.reason, "--idempotency-key", `cli-create-${randomUUID()}`];
    const first = await cli(createArgs), replay = await cli(createArgs);
    assert.equal(first.receipt.status, "COMMITTED");
    assert.equal(replay.receipt.status, "REPLAYED");
    assert.equal(first.spotId, replay.spotId);
    const patchArgs = ["spot-patch", first.spotId, "--input", patchPath, "--reason", "CLI optimistic revision", "--revision", "1", "--idempotency-key", `cli-patch-${randomUUID()}`];
    const edit = await cli(patchArgs), editReplay = await cli(patchArgs);
    assert.equal(edit.receipt.status, "COMMITTED");
    assert.equal(editReplay.receipt.status, "REPLAYED");
    assert.equal(edit.receipt.resultingRevision, 2);
    assert.equal(editReplay.receipt.receiptId, edit.receipt.receiptId);
    assert.deepEqual(await spotState(first.spotId), { version: 2, name: "CLI persisted edit", revisions: 2, patches: 1, verifications: 0 });
    assert.equal((await repository.pool.query("SELECT 1 FROM spots WHERE name=$1", [source.name])).rowCount, 0);

    // A rolling/mixed target can answer /session from a newer process while
    // routing writes to an older route catalog that ignores the key header.
    // Keep the real HTTP/auth/repository owner behind that bounded old catalog.
    let legacyWrites = 0;
    const legacyRouter = createServer(async (request, response) => {
      if (!(request.method === "GET" && request.url === "/v2/admin/session") &&
          !(request.method === "POST" && request.url === "/v2/admin/spots")) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ code: "NOT_FOUND" }));
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      if (request.method === "POST") ++legacyWrites;
      const forwarded = await fetch(`${apiBase}${request.url}`, { method: request.method,
        headers: { "content-type": "application/json", "x-admin-token": "synthetic-owner" },
        ...(request.method === "POST" ? { body: Buffer.concat(chunks).toString("utf8") } : {}) });
      response.writeHead(forwarded.status, { "content-type": "application/json" });
      response.end(await forwarded.text());
    });
    await new Promise<void>((resolve, reject) => { legacyRouter.once("error", reject); legacyRouter.listen(0, "127.0.0.1", resolve); });
    try {
      const address = legacyRouter.address();
      assert.ok(address && typeof address !== "string");
      const base = `http://127.0.0.1:${address.port}`;
      const control = candidate();
      const supportedLegacy = await fetch(`${base}/v2/admin/spots`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(control) });
      assert.equal(supportedLegacy.status, 201);
      await supportedLegacy.json();
      assert.equal((await repository.pool.query("SELECT 1 FROM spots WHERE name=$1", [control.name])).rowCount, 1);
      const guarded = candidate();
      await writeFile(createPath, JSON.stringify(guarded));
      const guardedArgs = [...createArgs.slice(0, -1), `mixed-target-${randomUUID()}`];
      await assert.rejects(() => cli(guardedArgs, base), /admin_http_404/u);
      assert.equal(legacyWrites, 1, "new command must not fall back to the old write route");
      assert.equal((await repository.pool.query("SELECT 1 FROM spots WHERE name=$1", [guarded.name])).rowCount, 0);
    } finally {
      await new Promise<void>((resolve, reject) => legacyRouter.close(error => error ? reject(error) : resolve()));
    }
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^starward-admin-spot-command-/u);
    await rm(directory, { recursive: true });
  }
});
