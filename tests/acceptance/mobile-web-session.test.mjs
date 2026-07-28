import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createMobileWebSession,
  disposeMobileWebSession,
  restartInputPaths,
  validateMobileWebSession,
} from "./mobile-web-session.mjs";

async function createRepositoryFixture(root) {
  for (const [index, relativePath] of restartInputPaths.entries()) {
    const target = path.join(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `fixture-${index}\n`, "utf8");
  }
}

function descriptorFetcher(session, mutate = (value) => value) {
  return async (url) => {
    assert.equal(new URL(url).pathname, session.descriptorPathname);
    const descriptor = mutate(JSON.parse(await readFile(session.publicPath, "utf8")));
    return {
      ok: true,
      status: 200,
      async json() {
        return descriptor;
      },
    };
  };
}

test("warm mobile Web reuse binds the live owner, same-origin descriptor and startup fingerprint", async () => {
  const repositoryRootValue = await mkdtemp(path.join(tmpdir(), "starward-web-session-repository-"));
  const temporaryRootValue = await mkdtemp(path.join(tmpdir(), "starward-web-session-registry-"));
  try {
    await createRepositoryFixture(repositoryRootValue);
    const session = await createMobileWebSession({
      apiBaseUrl: "http://127.0.0.1:4318",
      baseUrl: "http://127.0.0.1:4173",
      repositoryRootValue,
      temporaryRootValue,
      watchApi: true,
    });
    const validated = await validateMobileWebSession({
      baseUrl: session.base_url,
      fetcher: descriptorFetcher(session),
      repositoryRootValue,
      temporaryRootValue,
    });
    assert.equal(validated.session_id, session.session_id);
    assert.equal(validated.owner_pid, process.pid);
    assert.equal(validated.startup_fingerprint, session.startup_fingerprint);
    await disposeMobileWebSession(session);
    await assert.rejects(
      validateMobileWebSession({
        baseUrl: session.base_url,
        fetcher: descriptorFetcher(session),
        repositoryRootValue,
        temporaryRootValue,
      }),
      /warm_acceptance_session_registry_missing/u,
    );
  } finally {
    await rm(repositoryRootValue, { recursive: true, force: true });
    await rm(temporaryRootValue, { recursive: true, force: true });
  }
});

test("warm mobile Web reuse fails closed after restart-sensitive configuration changes", async () => {
  const repositoryRootValue = await mkdtemp(path.join(tmpdir(), "starward-web-fingerprint-repository-"));
  const temporaryRootValue = await mkdtemp(path.join(tmpdir(), "starward-web-fingerprint-registry-"));
  try {
    await createRepositoryFixture(repositoryRootValue);
    const session = await createMobileWebSession({
      apiBaseUrl: "http://127.0.0.1:4318",
      baseUrl: "http://127.0.0.1:4174",
      repositoryRootValue,
      temporaryRootValue,
      watchApi: false,
    });
    await writeFile(path.join(repositoryRootValue, "apps/mobile/app.json"), "changed-config\n", "utf8");
    await assert.rejects(
      validateMobileWebSession({
        baseUrl: session.base_url,
        fetcher: descriptorFetcher(session),
        repositoryRootValue,
        temporaryRootValue,
      }),
      /warm_acceptance_startup_fingerprint_mismatch/u,
    );
    await disposeMobileWebSession(session);
  } finally {
    await rm(repositoryRootValue, { recursive: true, force: true });
    await rm(temporaryRootValue, { recursive: true, force: true });
  }
});

test("warm mobile Web reuse rejects a descriptor from another session on the same port", async () => {
  const repositoryRootValue = await mkdtemp(path.join(tmpdir(), "starward-web-identity-repository-"));
  const temporaryRootValue = await mkdtemp(path.join(tmpdir(), "starward-web-identity-registry-"));
  try {
    await createRepositoryFixture(repositoryRootValue);
    const session = await createMobileWebSession({
      apiBaseUrl: "http://127.0.0.1:4318",
      baseUrl: "http://127.0.0.1:4175",
      repositoryRootValue,
      temporaryRootValue,
      watchApi: false,
    });
    await assert.rejects(
      validateMobileWebSession({
        baseUrl: session.base_url,
        fetcher: descriptorFetcher(session, (value) => ({ ...value, session_id: "other-session" })),
        repositoryRootValue,
        temporaryRootValue,
      }),
      /warm_acceptance_session_identity_mismatch:origin:session_id/u,
    );
    await disposeMobileWebSession(session);
  } finally {
    await rm(repositoryRootValue, { recursive: true, force: true });
    await rm(temporaryRootValue, { recursive: true, force: true });
  }
});
