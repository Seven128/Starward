import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";
import { createRequire } from "node:module";
import { createSkyOssClient } from "./sky-oss-client.mjs";

const requireRuntime = createRequire(new URL("./oss-runtime/package.json", import.meta.url));
const OSS = requireRuntime("ali-oss");
export const ossFixtureCredentials = { accessKeyId: "STARWARD_LOCAL_FIXTURE_ID", accessKeySecret: "STARWARD_LOCAL_FIXTURE_SECRET" };

/** Controlled loopback OSS oracle. Actual pinned SDK HTTP/XML/signing paths
 * execute against an owned server with explicitly fake credentials. No raw
 * Authorization/token field is retained in trace/results. It models contracts,
 * not OSS permissions, versioning atomicity, durability or cloud entitlement. */
export async function skyOssOracle(t, { beforeRequest, afterPut, versionXml, getBody, requestTimeout } = {}) {
  const objects = new Map(), trace = []; let puts = 0, versionStatus, closedResponses = 0;
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1"), parts = url.pathname.slice(1).split("/");
      const bucket = parts.shift(), key = parts.map(decodeURIComponent).join("/");
      assert.equal(bucket, "starward-local-fixture");
      const event = { method: request.method, key, versioning: url.searchParams.has("versioning"),
        authorizationPresent: !!request.headers.authorization,
        authorizationV4: request.headers.authorization?.startsWith("OSS4-HMAC-SHA256 ") ?? false,
        previewHeaderPresent: Object.keys(request.headers).some(name => name.startsWith("x-starward-preview")),
        acceptEncoding: request.headers["accept-encoding"] ?? null };
      trace.push(event);
      response.on("close", () => { closedResponses++; });
      if (beforeRequest && await beforeRequest({ request, response, key, event, objects, trace })) return;
      if (event.versioning) {
        response.setHeader("content-type", "application/xml");
        response.end(versionXml ?? `<?xml version="1.0" encoding="UTF-8"?><VersioningConfiguration xmlns="http://doc.oss-cn-hangzhou.aliyuncs.com">${versionStatus === undefined ? "" : `<Status>${versionStatus}</Status>`}</VersioningConfiguration>`);
        return;
      }
      if (request.method === "PUT") {
        const chunks = []; for await (const chunk of request) chunks.push(chunk);
        const bytes = Buffer.concat(chunks), headers = {};
        event.forbidOverwrite = request.headers["x-oss-forbid-overwrite"];
        event.contentMd5Valid = request.headers["content-md5"] === createHash("md5").update(bytes).digest("base64");
        assert.equal(event.forbidOverwrite, "true"); assert.equal(event.contentMd5Valid, true);
        puts++;
        if (objects.has(key)) {
          response.writeHead(409, { "content-type": "application/xml" });
          response.end("<Error><Code>FileAlreadyExists</Code><Message>Fixture conflict</Message></Error>"); return;
        }
        for (const [name, value] of Object.entries(request.headers)) if (name.startsWith("x-oss-meta-") ||
          ["content-type", "cache-control", "content-disposition", "content-length"].includes(name)) headers[name] = value;
        objects.set(key, { bytes, headers });
        if (afterPut && await afterPut({ request, response, key, objects, trace, puts })) return;
        response.writeHead(200, { etag: `"${createHash("md5").update(bytes).digest("hex")}"` }); response.end(); return;
      }
      const object = objects.get(key);
      if (!object) {
        response.writeHead(404, { "content-type": "application/xml" });
        response.end(request.method === "HEAD" ? undefined : "<Error><Code>NoSuchKey</Code><Message>Fixture missing</Message></Error>"); return;
      }
      response.writeHead(200, object.headers);
      if (request.method === "HEAD") response.end();
      else if (getBody) await getBody({ request, response, key, object, objects, trace });
      else response.end(object.bytes);
    } catch {
      if (!response.headersSent) response.writeHead(500, { "content-type": "application/xml" });
      response.end("<Error><Code>FixtureServerError</Code></Error>");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const sdkFactory = options => new OSS({ ...options, endpoint: `http://127.0.0.1:${address.port}`, secure: false, sldEnable: true });
  const factory = config => createSkyOssClient({ ...config, credentials: ossFixtureCredentials }, {
    ...(requestTimeout ? { requestTimeout } : {}),
    sdkFactory,
  });
  return { objects, trace, factory, sdkFactory, get puts() { return puts; }, get closedResponses() { return closedResponses; },
    setVersionStatus(value) { versionStatus = value; } };
}
