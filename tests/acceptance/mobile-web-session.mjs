import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const acceptanceRoot = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(acceptanceRoot, "../..");
const sessionSchema = "starward-mobile-web-session-v1";
const restartInputPaths = Object.freeze([
  "tests/acceptance/start-mobile-web.mjs",
  "tests/acceptance/mobile-web-session.mjs",
  "apps/mobile/app.json",
  "apps/mobile/babel.config.js",
  "apps/mobile/metro.config.js",
  "apps/mobile/package.json",
  "apps/mobile/index.web.js",
  "package-lock.json",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizedBaseUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || !url.port) {
    throw new Error(`mobile_web_session_base_url_invalid:${value}`);
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.href.replace(/\/$/u, "");
}

function baseUrlPort(value) {
  const url = new URL(normalizedBaseUrl(value));
  const port = Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`mobile_web_session_port_invalid:${url.port}`);
  }
  return port;
}

function repositoryIdentity(repositoryRootValue) {
  return sha256(path.resolve(repositoryRootValue).toLowerCase()).slice(0, 24);
}

export function mobileWebSessionPaths({
  baseUrl,
  repositoryRootValue = defaultRepositoryRoot,
  temporaryRootValue = tmpdir(),
}) {
  const webPort = baseUrlPort(baseUrl);
  const repositoryId = repositoryIdentity(repositoryRootValue);
  const filename = `starward-acceptance-session-${webPort}.json`;
  return {
    publicPath: path.join(repositoryRootValue, "apps", "mobile", "public", ".well-known", filename),
    registryPath: path.join(
      temporaryRootValue,
      "starward-mobile-web-sessions",
      repositoryId,
      `${webPort}.json`,
    ),
    descriptorPathname: `/.well-known/${filename}`,
    repositoryId,
    webPort,
  };
}

export function mobileWebOwnerAlive(ownerPid) {
  if (!Number.isInteger(ownerPid) || ownerPid <= 0) return false;
  try {
    process.kill(ownerPid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function mobileWebStartupFingerprint({
  baseUrl,
  repositoryRootValue = defaultRepositoryRoot,
  watchApi,
}) {
  const digest = createHash("sha256");
  for (const relativePath of restartInputPaths) {
    const absolutePath = path.join(repositoryRootValue, ...relativePath.split("/"));
    digest.update(relativePath);
    digest.update("\0");
    digest.update((await readFile(absolutePath)).toString("utf8").replaceAll("\r\n", "\n"));
    digest.update("\0");
  }
  digest.update(canonicalJson({
    base_url: normalizedBaseUrl(baseUrl),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    watch_api: watchApi === true,
  }));
  return digest.digest("hex");
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function atomicWriteJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rm(filePath, { force: true });
  await rename(temporaryPath, filePath);
}

export async function createMobileWebSession({
  apiBaseUrl,
  baseUrl,
  ownerPid = process.pid,
  repositoryRootValue = defaultRepositoryRoot,
  temporaryRootValue = tmpdir(),
  watchApi,
}) {
  const normalized = normalizedBaseUrl(baseUrl);
  const paths = mobileWebSessionPaths({
    baseUrl: normalized,
    repositoryRootValue,
    temporaryRootValue,
  });
  const previous = await readJsonIfPresent(paths.registryPath);
  if (previous?.owner_pid !== ownerPid && mobileWebOwnerAlive(previous?.owner_pid)) {
    throw new Error(`mobile_web_session_already_owned:${paths.webPort}:${previous.owner_pid}`);
  }
  const startupFingerprint = await mobileWebStartupFingerprint({
    baseUrl: normalized,
    repositoryRootValue,
    watchApi,
  });
  const descriptor = {
    schema_version: sessionSchema,
    product: "starward-mobile-web",
    session_id: randomUUID(),
    owner_pid: ownerPid,
    started_at: new Date().toISOString(),
    base_url: normalized,
    api_base_url: normalizedBaseUrl(apiBaseUrl),
    descriptor_pathname: paths.descriptorPathname,
    repository_id: paths.repositoryId,
    startup_fingerprint: startupFingerprint,
    watch_api: watchApi === true,
  };
  await atomicWriteJson(paths.registryPath, descriptor);
  await atomicWriteJson(paths.publicPath, descriptor);
  return { ...descriptor, ...paths };
}

async function removeOwnedDescriptor(filePath, sessionId) {
  const value = await readJsonIfPresent(filePath);
  if (value?.session_id !== sessionId) return;
  await rm(filePath, { force: true });
}

export async function disposeMobileWebSession(session) {
  if (!session?.session_id) return;
  await Promise.allSettled([
    removeOwnedDescriptor(session.publicPath, session.session_id),
    removeOwnedDescriptor(session.registryPath, session.session_id),
  ]);
}

function assertSameSession(actual, expected, source) {
  for (const key of [
    "schema_version",
    "product",
    "session_id",
    "owner_pid",
    "base_url",
    "api_base_url",
    "descriptor_pathname",
    "repository_id",
    "startup_fingerprint",
    "watch_api",
  ]) {
    if (actual?.[key] !== expected?.[key]) {
      throw new Error(`warm_acceptance_session_identity_mismatch:${source}:${key}`);
    }
  }
}

export async function validateMobileWebSession({
  baseUrl,
  fetcher = fetch,
  repositoryRootValue = defaultRepositoryRoot,
  temporaryRootValue = tmpdir(),
}) {
  const normalized = normalizedBaseUrl(baseUrl);
  const paths = mobileWebSessionPaths({
    baseUrl: normalized,
    repositoryRootValue,
    temporaryRootValue,
  });
  const registry = await readJsonIfPresent(paths.registryPath);
  if (!registry) throw new Error(`warm_acceptance_session_registry_missing:${normalized}`);
  if (registry.schema_version !== sessionSchema || registry.product !== "starward-mobile-web") {
    throw new Error("warm_acceptance_session_registry_invalid");
  }
  if (registry.base_url !== normalized || registry.repository_id !== paths.repositoryId) {
    throw new Error("warm_acceptance_session_registry_scope_mismatch");
  }
  if (!mobileWebOwnerAlive(registry.owner_pid)) {
    throw new Error(`warm_acceptance_session_owner_dead:${registry.owner_pid ?? "missing"}`);
  }
  const currentFingerprint = await mobileWebStartupFingerprint({
    baseUrl: normalized,
    repositoryRootValue,
    watchApi: registry.watch_api,
  });
  if (currentFingerprint !== registry.startup_fingerprint) {
    throw new Error("warm_acceptance_startup_fingerprint_mismatch");
  }
  const descriptorUrl = new URL(paths.descriptorPathname, `${normalized}/`).href;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  let response;
  try {
    response = await fetcher(descriptorUrl, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    throw new Error(`warm_acceptance_session_descriptor_unavailable:${descriptorUrl}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`warm_acceptance_session_descriptor_unhealthy:${response.status}`);
  let descriptor;
  try {
    descriptor = await response.json();
  } catch {
    throw new Error("warm_acceptance_session_descriptor_invalid_json");
  }
  assertSameSession(descriptor, registry, "origin");
  await access(paths.publicPath);
  return descriptor;
}

export {
  defaultRepositoryRoot,
  restartInputPaths,
  sessionSchema,
};
