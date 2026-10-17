import http from "node:http";
import https from "node:https";
import { createRequire } from "node:module";

const requireRuntime = createRequire(new URL("./oss-runtime/package.json", import.meta.url));
const fail = code => { throw new Error(`sky_oss_${code}`); };
export const SKY_OSS_REQUEST_TIMEOUT = 15_000;

export function assertSkyOssTarget({ bucket, region }) {
  if (typeof bucket !== "string" || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(bucket) ||
      typeof region !== "string" || !/^oss-cn-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(region)) fail("target_invalid");
  return Object.freeze({ bucket, region });
}

function response(result) {
  const raw = result?.res;
  if (!raw || !Number.isInteger(raw.status) || !raw.headers || typeof raw.headers !== "object") fail("response_invalid");
  return { status: raw.status, headers: new Headers(raw.headers) };
}

/** Only the SDK signs requests. The executable supplies environment credentials,
 * a fixed regional HTTPS endpoint and dedicated agents. The factory parameter
 * is an internal dependency seam for actual SDK tests against a local oracle. */
export function createSkyOssClient({ bucket, region, credentials, signal }, { sdkFactory, requestTimeout = SKY_OSS_REQUEST_TIMEOUT } = {}) {
  const target = assertSkyOssTarget({ bucket, region });
  if (process.env.DEBUG || process.env.NODE_DEBUG) fail("credential_diagnostics_enabled");
  if (!credentials || typeof credentials.accessKeyId !== "string" || !credentials.accessKeyId.trim() ||
      typeof credentials.accessKeySecret !== "string" || !credentials.accessKeySecret.trim() ||
      credentials.stsToken !== undefined && (typeof credentials.stsToken !== "string" || !credentials.stsToken.trim())) fail("credentials_missing");
  if (signal?.aborted) fail("aborted");
  if (!Number.isInteger(requestTimeout) || requestTimeout < 1 || requestTimeout > SKY_OSS_REQUEST_TIMEOUT) fail("timeout_invalid");
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1 });
  const streams = new Set(); let closed = false;
  const dispose = () => {
    if (closed) return;
    closed = true;
    signal?.removeEventListener("abort", dispose);
    for (const stream of streams) stream.destroy();
    agent.destroy(); httpsAgent.destroy();
  };
  let sdk;
  try {
    const options = { ...target, accessKeyId: credentials.accessKeyId, accessKeySecret: credentials.accessKeySecret,
      ...(credentials.stsToken ? { stsToken: credentials.stsToken, refreshSTSTokenInterval: 300_000 } : {}),
      endpoint: `https://${region}.aliyuncs.com`, secure: true, authorizationV4: true, retryMax: 0,
      timeout: requestTimeout, agent, httpsAgent };
    sdk = sdkFactory ? sdkFactory(options) : new (requireRuntime("ali-oss"))(options);
    signal?.addEventListener("abort", dispose, { once: true });
  } catch { dispose(); fail("client_initialization_failed"); }
  const active = () => { if (closed || signal?.aborted) fail("aborted"); };
  const headers = { "accept-encoding": "identity" };
  // Await actual transport settlement. Destroying only these owned agents and
  // streams bounds the whole request, including a periodically active body;
  // there is no Promise.race that abandons an in-flight PUT. Agents can serve
  // the subsequent exact recovery read after a timeout, until dispose closes
  // this client. No SDK/global agent is destroyed.
  const request = async operation => {
    active(); let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      for (const stream of streams) stream.destroy(new Error("sky_oss_request_timeout"));
      agent.destroy(); httpsAgent.destroy();
    }, requestTimeout);
    try {
      const result = await operation();
      if (expired) fail("request_timeout");
      active(); return result;
    } catch (error) { if (expired) fail("request_timeout"); throw error; }
    finally { clearTimeout(timer); }
  };
  return Object.freeze({ ...target, dispose,
    async versioning() {
      const result = await request(() => sdk.getBucketVersioning(bucket, { headers: { ...headers }, timeout: requestTimeout }));
      const readback = response(result);
      if (readback.status !== 200 || result.status !== 200 || !Object.hasOwn(result, "versionStatus")) fail("versioning_response_invalid");
      // ali-oss omits Status for an empty configuration, but its generic XML
      // parser also drops the root. Validate that absence against the real raw
      // provider response, so a 200 with unrelated XML is never treated as an
      // unversioned bucket. xml2js is the same mature parser used by the SDK.
      let xml;
      try { xml = await requireRuntime("xml2js").parseStringPromise(result.res.data, { explicitArray: false }); }
      catch { fail("versioning_response_invalid"); }
      if (!xml || Object.keys(xml).join() !== "VersioningConfiguration") fail("versioning_response_invalid");
      const configuration = xml.VersioningConfiguration;
      if (configuration !== "" && (!configuration || typeof configuration !== "object" ||
          Object.keys(configuration).some(key => !["$", "Status"].includes(key)))) fail("versioning_response_invalid");
      if ((configuration?.Status ?? undefined) !== result.versionStatus) fail("versioning_response_invalid");
      return { status: 200, versionStatus: result.versionStatus };
    },
    async head(key) {
      return response(await request(() => sdk.head(key, { headers: { ...headers }, timeout: requestTimeout })));
    },
    async get(key, maximumBytes) {
      active();
      if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) fail("body_limit_invalid");
      return request(async () => {
        const result = await sdk.getStream(key, { headers: { ...headers }, timeout: requestTimeout });
        const stream = result.stream;
        if (!stream?.[Symbol.asyncIterator] || typeof stream.destroy !== "function") fail("stream_invalid");
        streams.add(stream);
        try {
          active();
          const readback = response(result), chunks = []; let count = 0;
          for await (const chunk of stream) {
            active(); count += chunk.length;
            if (count > maximumBytes) fail("body_too_large");
            chunks.push(Buffer.from(chunk));
          }
          return { ...readback, bytes: Buffer.concat(chunks, count) };
        } finally { streams.delete(stream); stream.destroy(); }
      });
    },
    async put(key, bytes, uploadHeaders) {
      active();
      if (!Buffer.isBuffer(bytes) || uploadHeaders?.["x-oss-forbid-overwrite"] !== "true") fail("upload_invalid");
      return response(await request(() => sdk.put(key, bytes, { headers: { ...uploadHeaders }, timeout: requestTimeout })));
    },
  });
}
