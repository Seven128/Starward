import { createHash } from "node:crypto";

export interface HeadersLike {
  get(name: string): string | null;
}

export interface ResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: HeadersLike;
  readonly url?: string;
  readonly body?: AsyncIterable<Uint8Array> | {
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
      releaseLock?(): void;
    };
  } | null;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type HttpTransport = (input: string | URL, init?: RequestInit) => Promise<ResponseLike>;
export type Sleep = (milliseconds: number) => Promise<void>;

export class UpstreamHttpError extends Error {
  constructor(
    public readonly provider: string,
    public readonly status: number,
    public readonly safeUrl: string,
    public readonly retryable: boolean,
  ) {
    super(`${provider}_http_${status}`);
    this.name = "UpstreamHttpError";
  }
}

const SECRET_QUERY_KEYS = new Set([
  "key", "apikey", "api_key", "token", "access_token", "sig", "signature",
  "x-amz-credential", "x-amz-signature", "x-amz-security-token",
]);

export function redactProviderUrl(input: string | URL): string {
  const url = new URL(input.toString());
  if (url.username) url.username = "[redacted]";
  if (url.password) url.password = "[redacted]";
  for (const key of [...url.searchParams.keys()]) {
    if (SECRET_QUERY_KEYS.has(key.toLowerCase())) url.searchParams.set(key, "[redacted]");
  }
  return url.toString();
}

export function assertHttpsHost(url: URL, allowedHosts: readonly string[]): void {
  if (url.protocol !== "https:") throw new TypeError("provider_https_required");
  if (!allowedHosts.some((host) => url.hostname === host || (host.startsWith("*.") && url.hostname.endsWith(host.slice(1))))) {
    throw new TypeError("provider_host_not_allowed");
  }
}

function retryAfterMilliseconds(headers: HeadersLike, attempt: number): number {
  const raw = headers.get("retry-after");
  if (raw && /^\d+$/u.test(raw)) return Math.min(Number(raw) * 1000, 30_000);
  return Math.min(250 * (2 ** Math.max(0, attempt - 1)), 4_000);
}

export async function requestJson<T>(input: {
  provider: string;
  url: URL;
  init?: RequestInit;
  transport?: HttpTransport;
  timeoutMs?: number;
  maxAttempts?: number;
  retryStatuses?: readonly number[];
  sleep?: Sleep;
}): Promise<T> {
  const transport = input.transport ?? (globalThis.fetch as unknown as HttpTransport);
  const maxAttempts = Math.max(1, input.maxAttempts ?? 2);
  const retryStatuses = new Set(input.retryStatuses ?? [429, 500, 502, 503, 504]);
  const sleep = input.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const safeUrl = redactProviderUrl(input.url);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeout = AbortSignal.timeout(input.timeoutMs ?? 8_000);
    try {
      const response = await transport(input.url, { ...input.init, signal: timeout });
      if (response.ok) return await response.json() as T;
      const retryable = retryStatuses.has(response.status);
      const error = new UpstreamHttpError(input.provider, response.status, safeUrl, retryable);
      if (!retryable || attempt === maxAttempts) throw error;
      await sleep(retryAfterMilliseconds(response.headers, attempt));
      lastError = error;
    } catch (error) {
      if (error instanceof UpstreamHttpError) throw error;
      lastError = error;
      if (attempt === maxAttempts) throw new Error(`${input.provider}_transport_failed`, { cause: error });
      await sleep(Math.min(250 * (2 ** Math.max(0, attempt - 1)), 4_000));
    }
  }
  throw new Error(`${input.provider}_transport_failed`, { cause: lastError });
}

export interface ImmutableRawObject {
  key: string;
  body: Uint8Array;
  sha256: string;
  metadata: Record<string, string>;
}

export interface ImmutableRawSink {
  putIfAbsent(object: ImmutableRawObject): Promise<{ stored: boolean; versionId: string }>;
}

export interface StagedImmutableRawUpload {
  write(chunk: Uint8Array): Promise<void>;
  commit(input: {
    key: string;
    sha256: string;
    bytes: number;
    metadata: Record<string, string>;
  }): Promise<{ stored: boolean; versionId: string }>;
  abort(reason: string): Promise<void>;
}

/**
 * Production object stores should implement this with a temporary multipart
 * upload and a server-side copy/conditional put into the final content-addressed
 * key. No partially downloaded object may become a published object.
 */
export interface StagedImmutableRawSink {
  begin(input: { stagingHint: string; metadata: Record<string, string> }): Promise<StagedImmutableRawUpload>;
}

function safeSegment(value: string): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  if (!cleaned) throw new TypeError("immutable_object_segment_required");
  return cleaned;
}

function assertArtifactInput(input: { expectedSha256?: string; maxBytes: number }): void {
  if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes <= 0) throw new RangeError("artifact_max_bytes_invalid");
  if (input.expectedSha256 && !/^[a-fA-F0-9]{64}$/u.test(input.expectedSha256)) throw new TypeError("artifact_expected_sha256_invalid");
}

function assertFinalResponseHost(response: ResponseLike, allowedHosts: readonly string[]): void {
  if (!allowedHosts.length) throw new TypeError("artifact_allowed_hosts_required");
  if (!response.url) throw new TypeError("artifact_final_url_required");
  assertHttpsHost(new URL(response.url), allowedHosts);
}

async function* responseChunks(response: ResponseLike): AsyncGenerator<Uint8Array> {
  const body = response.body;
  if (body && Symbol.asyncIterator in Object(body)) {
    for await (const chunk of body as AsyncIterable<Uint8Array>) yield chunk;
    return;
  }
  if (body && "getReader" in body && typeof body.getReader === "function") {
    const reader = body.getReader();
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        if (next.value?.byteLength) yield next.value;
      }
    } finally {
      reader.releaseLock?.();
    }
    return;
  }
  yield new Uint8Array(await response.arrayBuffer());
}

function artifactIdentity(input: { source: string; datasetVersion: string; url: URL }) {
  const filename = safeSegment(input.url.pathname.split("/").filter(Boolean).at(-1) ?? "artifact.bin");
  return {
    source: safeSegment(input.source),
    datasetVersion: safeSegment(input.datasetVersion),
    filename,
  };
}

export async function acquireImmutableArtifact(input: {
  source: string;
  datasetVersion: string;
  url: URL;
  licenseVersion: string;
  expectedSha256?: string;
  maxBytes: number;
  sink: ImmutableRawSink;
  transport?: HttpTransport;
  fetchedAt: string;
}): Promise<{ key: string; sha256: string; bytes: number; versionId: string; stored: boolean; lineage: string[] }> {
  assertArtifactInput(input);
  if (input.url.protocol !== "https:") throw new TypeError("artifact_https_required");
  const transport = input.transport ?? (globalThis.fetch as unknown as HttpTransport);
  const response = await transport(input.url, { method: "GET", signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new UpstreamHttpError(input.source, response.status, redactProviderUrl(input.url), false);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > input.maxBytes) throw new RangeError("artifact_declared_size_exceeds_limit");
  const body = new Uint8Array(await response.arrayBuffer());
  if (body.byteLength > input.maxBytes) throw new RangeError("artifact_size_exceeds_limit");
  const sha256 = createHash("sha256").update(body).digest("hex");
  if (input.expectedSha256 && sha256 !== input.expectedSha256.toLowerCase()) throw new Error("artifact_checksum_mismatch");
  const { filename, source, datasetVersion } = artifactIdentity(input);
  const key = `raw-restricted/${source}/${datasetVersion}/${sha256}/${filename}`;
  const result = await input.sink.putIfAbsent({
    key,
    body,
    sha256,
    metadata: {
      source,
      datasetVersion,
      licenseVersion: input.licenseVersion,
      fetchedAt: input.fetchedAt,
      sourceUrl: redactProviderUrl(input.url),
    },
  });
  return {
    key,
    sha256,
    bytes: body.byteLength,
    versionId: result.versionId,
    stored: result.stored,
    lineage: [`${source}:source:${datasetVersion}`, `${source}:raw:${sha256}`],
  };
}

export async function acquireStreamingImmutableArtifact(input: {
  source: string;
  datasetVersion: string;
  url: URL;
  allowedHosts: readonly string[];
  licenseVersion: string;
  expectedSha256?: string;
  maxBytes: number;
  sink: StagedImmutableRawSink;
  transport?: HttpTransport;
  init?: RequestInit;
  fetchedAt: string;
}): Promise<{ key: string; sha256: string; bytes: number; versionId: string; stored: boolean; lineage: string[] }> {
  assertArtifactInput(input);
  assertHttpsHost(input.url, input.allowedHosts);
  const transport = input.transport ?? (globalThis.fetch as unknown as HttpTransport);
  const response = await transport(input.url, { ...input.init, method: "GET", signal: AbortSignal.timeout(30 * 60_000) });
  if (!response.ok) throw new UpstreamHttpError(input.source, response.status, redactProviderUrl(input.url), false);
  assertFinalResponseHost(response, input.allowedHosts);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > input.maxBytes) throw new RangeError("artifact_declared_size_exceeds_limit");

  const { filename, source, datasetVersion } = artifactIdentity(input);
  const metadata = {
    source,
    datasetVersion,
    licenseVersion: input.licenseVersion,
    fetchedAt: input.fetchedAt,
    sourceUrl: redactProviderUrl(input.url),
  };
  const upload = await input.sink.begin({ stagingHint: `${source}/${datasetVersion}/${filename}`, metadata });
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    for await (const chunk of responseChunks(response)) {
      bytes += chunk.byteLength;
      if (bytes > input.maxBytes) throw new RangeError("artifact_size_exceeds_limit");
      hash.update(chunk);
      await upload.write(chunk);
    }
    if (bytes === 0) throw new Error("artifact_empty");
    const sha256 = hash.digest("hex");
    if (input.expectedSha256 && sha256 !== input.expectedSha256.toLowerCase()) throw new Error("artifact_checksum_mismatch");
    const key = `raw-restricted/${source}/${datasetVersion}/${sha256}/${filename}`;
    const result = await upload.commit({ key, sha256, bytes, metadata });
    return {
      key,
      sha256,
      bytes,
      versionId: result.versionId,
      stored: result.stored,
      lineage: [`${source}:source:${datasetVersion}`, `${source}:raw:${sha256}`],
    };
  } catch (error) {
    await upload.abort(error instanceof Error ? error.message : "artifact_stream_failed").catch(() => undefined);
    throw error;
  }
}

export type ActivationDisposition = "implemented-awaiting-external-activation" | "enabled" | "invalid";

export function evaluateProductionCarrier(input: {
  implementationStatus: "passed" | "failed";
  externalActivationStatus: "pending" | "confirmed";
  productionEnabled: boolean;
}) {
  const valid = input.implementationStatus === "passed"
    && ((input.externalActivationStatus === "confirmed" && input.productionEnabled)
      || (input.externalActivationStatus === "pending" && !input.productionEnabled));
  const disposition: ActivationDisposition = !valid
    ? "invalid"
    : input.productionEnabled
      ? "enabled"
      : "implemented-awaiting-external-activation";
  return {
    implementationComplete: input.implementationStatus === "passed",
    productionTrafficAllowed: valid && disposition === "enabled",
    externalActivationPending: valid && disposition === "implemented-awaiting-external-activation",
    disposition,
  };
}

export { S3StagedImmutableRawSink } from "./s3-staged-immutable-raw-sink";
export type { S3StagedImmutableRawSinkOptions } from "./s3-staged-immutable-raw-sink";
