import { generateKeyPairSync, createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { acquireImmutableArtifact, acquireStreamingImmutableArtifact, requestJson, S3StagedImmutableRawSink, UpstreamHttpError, type HttpTransport, type ResponseLike } from "../../../../packages/data-source-runtime/src/index";
import { CelesTrakOmmClient } from "../../../../data-pipelines/src/celestrak-omm-client";
import { CopernicusDemIngestClient } from "../../../../data-pipelines/src/copernicus-dem-ingest";
import { AmapRouteHttpAdapter } from "../modules/map/amap-route-http-adapter";
import { OpenMeteoHttpClient } from "../modules/forecast/open-meteo-http-client";
import { createQWeatherJwt, QWeatherHttpClient } from "../modules/forecast/qweather-http-client";
import type { WeatherProviderGateRecord } from "../modules/forecast/provider-gate";
import { createProductionDataSourceRuntime } from "../modules/providers/production-data-source-runtime";

function response(body: unknown, status = 200, headers: Record<string, string> = {}): ResponseLike {
  const bytes = new TextEncoder().encode(typeof body === "string" ? body : JSON.stringify(body));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
    arrayBuffer: async () => bytes.buffer,
  };
}

const productionGate = (id: "qweather" | "open-meteo"): WeatherProviderGateRecord => ({
  id,
  productionEnabled: true,
  passedGates: ["provenance", "authenticity", "target-region-stability", "commercial-rights", "safe-degradation"],
  licenseStatus: "approved-commercial",
});

describe("production provider carriers", () => {
  it("keeps provider clients fail-closed until external activation is confirmed", () => {
    const runtime = createProductionDataSourceRuntime({
      activation: { implementationStatus: "passed", externalActivationStatus: "pending", productionEnabled: false },
    });
    expect(runtime.activation).toMatchObject({
      implementationComplete: true,
      externalActivationPending: true,
      productionTrafficAllowed: false,
      disposition: "implemented-awaiting-external-activation",
    });
    expect(runtime.qweather).toBeNull();
    expect(runtime.openMeteo).toBeNull();
    expect(runtime.amap).toBeNull();
  });

  it("signs QWeather JWT on the server and calls the account API host for forecast and alerts", async () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const seen: Array<{ url: URL; authorization: string }> = [];
    const transport: HttpTransport = async (input, init) => {
      const url = new URL(input.toString());
      seen.push({ url, authorization: new Headers(init?.headers).get("authorization") ?? "" });
      if (url.pathname.includes("weatheralert")) {
        return response({ metadata: { attributions: ["深圳市气象台"] }, alerts: [{ id: "alert-1", senderName: "深圳市气象台", issuedTime: "2026-08-12T12:00:00Z", effectiveTime: "2026-08-12T12:05:00Z", expireTime: "2026-08-12T15:00:00Z", severity: "minor", eventType: { name: "雷雨大风" }, headline: "深圳市雷雨大风预警", messageType: { code: "alert" } }] });
      }
      return response({ updateTime: "2026-08-12T12:00:00Z", fxLink: "https://www.qweather.com/", hourly: [{ fxTime: "2026-08-12T13:00:00Z", temp: "27", humidity: "70", cloud: "20", windSpeed: "10.8", vis: "15", precip: "0" }] });
    };
    const client = new QWeatherHttpClient({
      apiHost: "starward-fixture.qweatherapi.com",
      credentialId: "credential-1",
      projectId: "project-1",
      privateKeyPem,
      licenseVersion: "fixture-contract",
      rawRetentionAllowed: false,
      gate: productionGate("qweather"),
      use: "production",
      transport,
      now: () => new Date("2026-08-12T12:01:00Z"),
    });
    const run = await client.load({ latitude: 22.529, longitude: 113.9468, runId: "run-1", expiresAt: "2026-08-12T13:00:00Z" });
    expect(seen).toHaveLength(2);
    expect(seen.every((item) => item.url.hostname === "starward-fixture.qweatherapi.com")).toBe(true);
    expect(seen.every((item) => item.authorization.startsWith("Bearer "))).toBe(true);
    expect(run).toMatchObject({ provider: "qweather", use: "production", runId: "run-1" });
    expect(run.warnings[0]).toMatchObject({ id: "alert-1", title: "深圳市雷雨大风预警", sources: ["深圳市气象台"] });

    const jwt = createQWeatherJwt({ credentialId: "credential-1", projectId: "project-1", privateKeyPem, nowEpochSeconds: 1_786_536_060 });
    const [header, payload] = jwt.split(".").slice(0, 2).map((part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>);
    expect(header).toEqual({ alg: "EdDSA", kid: "credential-1" });
    expect(payload.sub).toBe("project-1");

    const partial = new QWeatherHttpClient({
      apiHost: "starward-fixture.qweatherapi.com", credentialId: "credential-1", projectId: "project-1", privateKeyPem,
      licenseVersion: "fixture-contract", rawRetentionAllowed: false, gate: productionGate("qweather"), use: "production",
      transport: async (input) => new URL(input.toString()).pathname.includes("weatheralert")
        ? response({ code: "unauthorized" }, 401)
        : response({ updateTime: "2026-08-12T12:00:00Z", fxLink: "https://www.qweather.com/", hourly: [{ fxTime: "2026-08-12T13:00:00Z", temp: "27", humidity: "70", cloud: "20", windSpeed: "10.8", vis: "15", precip: "0" }] }),
      now: () => new Date("2026-08-12T12:01:00Z"),
    });
    const partialRun = await partial.load({ latitude: 22.529, longitude: 113.9468, runId: "run-partial", expiresAt: "2026-08-12T13:00:00Z" });
    expect(partialRun.qualityFlags).toContain("warning-feed-unavailable");
    expect(partialRun.warnings).toEqual([]);
  });

  it("uses the Open-Meteo customer endpoint and explicit models for commercial production", async () => {
    const requested: URL[] = [];
    const transport: HttpTransport = async (input) => {
      requested.push(new URL(input.toString()));
      return response({
        latitude: 22.529,
        longitude: 113.9468,
        utc_offset_seconds: 0,
        hourly: { time: ["2026-08-12T13:00"], temperature_2m: [27], relative_humidity_2m: [70], cloud_cover: [12], cloud_cover_low: [4], cloud_cover_mid: [6], cloud_cover_high: [8], visibility: [15_000], wind_speed_10m: [3], precipitation: [0] },
        hourly_units: { visibility: "m", wind_speed_10m: "m/s" },
      });
    };
    const client = new OpenMeteoHttpClient({
      endpointClass: "commercial",
      apiKey: "commercial-secret",
      models: ["cma_grapes_global", "ecmwf_ifs025"],
      licenseVersion: "CC-BY-4.0+commercial-2026-08",
      rawRetentionAllowed: true,
      gate: productionGate("open-meteo"),
      use: "production",
      transport,
      now: () => new Date("2026-08-12T12:01:00Z"),
    });
    const run = await client.load({ latitude: 22.529, longitude: 113.9468, runId: "om-run-1", issuedAt: "2026-08-12T12:00:00Z", expiresAt: "2026-08-12T18:00:00Z" });
    expect(requested[0]?.hostname).toBe("customer-api.open-meteo.com");
    expect(requested[0]?.searchParams.get("apikey")).toBe("commercial-secret");
    expect(requested[0]?.searchParams.get("timezone")).toBe("GMT");
    expect(requested[0]?.searchParams.get("models")).toBe("cma_grapes_global,ecmwf_ifs025");
    expect(run).toMatchObject({ provider: "open-meteo", use: "production", runId: "om-run-1" });
  });

  it("calls AMap direction v5 only at the GCJ-02 server boundary and normalizes a route", async () => {
    const requested: URL[] = [];
    const adapter = new AmapRouteHttpAdapter({
      webServiceKey: "amap-secret",
      now: () => new Date("2026-08-12T12:00:00Z"),
      transport: async (input) => {
        requested.push(new URL(input.toString()));
        return response({ status: "1", info: "ok", infocode: "10000", route: { paths: [{ distance: "68000", cost: { duration: "4200" }, steps: [{ polyline: "113.9,22.5;114.0,22.6" }] }] } });
      },
    });
    const result = await adapter.route({ origin: { lat: 22.529, lon: 113.9468, system: "GCJ-02" }, destination: { lat: 22.482, lon: 114.521, system: "GCJ-02" }, mode: "drive" });
    expect(requested[0]?.pathname).toBe("/v5/direction/driving");
    expect(requested[0]?.searchParams.get("key")).toBe("amap-secret");
    expect(requested[0]?.searchParams.get("strategy")).toBe("32");
    expect(result).toMatchObject({ providerVersion: "amap-web-service-direction-v5", distanceMeters: 68_000, durationSeconds: 4_200 });
    expect(result.geometry).toContain("113.9,22.5");
  });

  it("normalizes the distinct AMap transit v5 response shape", async () => {
    const adapter = new AmapRouteHttpAdapter({
      webServiceKey: "amap-secret",
      resolveTransitCities: async () => ({ city1: "0755", city2: "0755" }),
      transport: async (input) => {
        const url = new URL(input.toString());
        expect(url.pathname).toBe("/v5/direction/transit/integrated");
        expect(url.searchParams.get("city1")).toBe("0755");
        return response({ status: "1", info: "ok", infocode: "10000", route: { transits: [{ distance: "21000", cost: { duration: "3600" }, segments: [{ walking: { steps: [{ polyline: "113.9,22.5;113.91,22.51" }] }, bus: { buslines: [{ polyline: "113.91,22.51;114.0,22.6" }] } }] }] } });
      },
    });
    const result = await adapter.route({ origin: { lat: 22.529, lon: 113.9468, system: "GCJ-02" }, destination: { lat: 22.482, lon: 114.521, system: "GCJ-02" }, mode: "transit" });
    expect(result).toMatchObject({ distanceMeters: 21_000, durationSeconds: 3_600 });
    expect(result.geometry).toContain("114.0,22.6");
  });

  it("redacts provider credentials from typed HTTP failures", async () => {
    try {
      await requestJson({
        provider: "fixture",
        url: new URL("https://user:password@example.test/data?apikey=top-secret&key=also-secret&X-Amz-Signature=aws-secret"),
        maxAttempts: 1,
        transport: async () => response({ code: "unauthorized" }, 401),
      });
      throw new Error("expected_failure");
    } catch (error) {
      expect(error).toBeInstanceOf(UpstreamHttpError);
      expect((error as UpstreamHttpError).safeUrl).not.toContain("top-secret");
      expect((error as UpstreamHttpError).safeUrl).not.toContain("also-secret");
      expect((error as UpstreamHttpError).safeUrl).not.toContain("aws-secret");
      expect((error as UpstreamHttpError).safeUrl).not.toContain("password");
      expect((error as UpstreamHttpError).safeUrl).toContain("%5Bredacted%5D");
    }
  });
});

describe("immutable and scheduled source acquisition", () => {
  it("verifies checksums and writes a content-addressed raw object exactly once", async () => {
    const body = new TextEncoder().encode("fixture-geospatial-object");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const putIfAbsent = vi.fn(async (object: { key: string }) => ({ stored: true, versionId: `version:${object.key}` }));
    const result = await acquireImmutableArtifact({
      source: "eog-viirs-vnl",
      datasetVersion: "v2.2-2025",
      url: new URL("https://eogdata.mines.edu/nighttime_light/fixture.tif.gz"),
      licenseVersion: "CC-BY-4.0",
      expectedSha256: sha256,
      maxBytes: 1024,
      sink: { putIfAbsent },
      transport: async () => response("fixture-geospatial-object", 200, { "content-length": String(body.byteLength) }),
      fetchedAt: "2026-08-12T12:00:00Z",
    });
    expect(result.key).toContain(`raw-restricted/eog-viirs-vnl/v2.2-2025/${sha256}/fixture.tif.gz`);
    expect(result.lineage).toEqual(["eog-viirs-vnl:source:v2.2-2025", `eog-viirs-vnl:raw:${sha256}`]);
    expect(putIfAbsent).toHaveBeenCalledOnce();
  });

  it("streams large static artifacts through staging and aborts before commit on checksum failure", async () => {
    const first = new TextEncoder().encode("first-");
    const second = new TextEncoder().encode("second");
    const writes: Uint8Array[] = [];
    const commit = vi.fn(async () => ({ stored: true, versionId: "version-1" }));
    const abort = vi.fn(async () => undefined);
    const sink = { begin: vi.fn(async () => ({ write: async (chunk: Uint8Array) => { writes.push(chunk); }, commit, abort })) };
    const transport: HttpTransport = async () => ({
      ...response("unused", 200, { "content-length": String(first.byteLength + second.byteLength) }),
      url: "https://eogdata.mines.edu/nighttime_light/fixture.tif.gz",
      body: (async function* () { yield first; yield second; })(),
    });
    const expected = createHash("sha256").update(first).update(second).digest("hex");
    const result = await acquireStreamingImmutableArtifact({
      source: "eog-viirs-vnl", datasetVersion: "v2.2-2025",
      url: new URL("https://eogdata.mines.edu/nighttime_light/fixture.tif.gz"),
      allowedHosts: ["eogdata.mines.edu"], licenseVersion: "CC-BY-4.0",
      expectedSha256: expected, maxBytes: 1024, sink, transport, fetchedAt: "2026-08-12T12:00:00Z",
    });
    expect(writes).toHaveLength(2);
    expect(result.sha256).toBe(expected);
    expect(commit).toHaveBeenCalledOnce();
    expect(abort).not.toHaveBeenCalled();

    await expect(acquireStreamingImmutableArtifact({
      source: "eog-viirs-vnl", datasetVersion: "v2.2-2025",
      url: new URL("https://eogdata.mines.edu/nighttime_light/fixture.tif.gz"),
      allowedHosts: ["eogdata.mines.edu"], licenseVersion: "CC-BY-4.0",
      expectedSha256: "0".repeat(64), maxBytes: 1024, sink, transport, fetchedAt: "2026-08-12T12:00:00Z",
    })).rejects.toThrow("artifact_checksum_mismatch");
    expect(abort).toHaveBeenCalledOnce();
  });

  it("commits a staged multipart stream into a verified S3-compatible content key", async () => {
    const commands: Array<{ name: string; input: Record<string, unknown> }> = [];
    const uploaded: Uint8Array[] = [];
    const fakeClient = { send: vi.fn(async (command: { input: Record<string, unknown>; constructor: { name: string } }) => {
      commands.push({ name: command.constructor.name, input: command.input });
      if (command.constructor.name === "HeadObjectCommand") throw Object.assign(new Error("not found"), { name: "NotFound", $metadata: { httpStatusCode: 404 } });
      if (command.constructor.name === "CopyObjectCommand") return { VersionId: "final-version-1", CopyObjectResult: { ETag: "etag-1" } };
      return {};
    }) };
    const sink = new S3StagedImmutableRawSink({
      environment: "production",
      endpoint: "https://cos.ap-guangzhou.myqcloud.com",
      region: "ap-guangzhou",
      bucket: "starward-raw-fixture",
      client: fakeClient,
      uploadFactory: ({ params }) => {
        const done = (async () => {
          for await (const chunk of params.Body as AsyncIterable<Uint8Array>) uploaded.push(new Uint8Array(chunk));
          return { VersionId: "temporary-version-1" };
        })();
        return { done: () => done, abort: async () => undefined };
      },
    });
    const body = new TextEncoder().encode("s3-compatible-stream");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const result = await acquireStreamingImmutableArtifact({
      source: "gaia-dr3", datasetVersion: "gdr3-fixture",
      url: new URL("https://cdn.gea.esac.esa.int/Gaia/gdr3/gaia_source/fixture.csv.gz"),
      allowedHosts: ["cdn.gea.esac.esa.int"], licenseVersion: "Gaia-DR3-fixture",
      expectedSha256: sha256, maxBytes: 1024, sink,
      transport: async () => ({ ...response("unused", 200, { "content-length": String(body.byteLength) }), url: "https://cdn.gea.esac.esa.int/Gaia/gdr3/gaia_source/fixture.csv.gz", body: (async function* () { yield body; })() }),
      fetchedAt: "2026-08-12T12:00:00Z",
    });
    expect(Buffer.concat(uploaded.map((chunk) => Buffer.from(chunk))).toString("utf8")).toBe("s3-compatible-stream");
    expect(commands.map((item) => item.name)).toEqual(["HeadObjectCommand", "CopyObjectCommand", "DeleteObjectCommand"]);
    expect(commands[1]?.input).toMatchObject({ Bucket: "starward-raw-fixture", Key: result.key, MetadataDirective: "REPLACE" });
    expect(result).toMatchObject({ stored: true, versionId: "final-version-1", sha256 });
  });

  it("selects the official Copernicus DEM STAC asset and streams it from the CDSE eodata bucket", async () => {
    const body = new TextEncoder().encode("copernicus-dem-cog");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const writes: Uint8Array[] = [];
    const client = new CopernicusDemIngestClient({
      accessKeyId: "fixture-access", secretAccessKey: "fixture-secret",
      catalogTransport: async (input, init) => {
        expect(new URL(input.toString()).toString()).toBe("https://stac.dataspace.copernicus.eu/v1/search");
        expect(JSON.parse(String(init?.body))).toMatchObject({ collections: ["cop-dem-glo-30-dged-cog"], ids: ["tile-1"] });
        return response({ features: [{ id: "tile-1", assets: { data: { href: "s3://eodata/auxdata/CopDEM_COG/copernicus-dem-30m/tile-1.tif", type: "image/tiff; application=geotiff" } } }] });
      },
      s3Client: { send: vi.fn(async (command: { input?: { Bucket?: string; Key?: string } }) => {
        expect(command.input).toMatchObject({ Bucket: "eodata", Key: "auxdata/CopDEM_COG/copernicus-dem-30m/tile-1.tif" });
        return { ContentLength: body.byteLength, ETag: "fixture-etag", Body: (async function* () { yield body; })() };
      }) },
    });
    const assets = await client.selectAssets({ ids: ["tile-1"] });
    expect(assets[0]).toMatchObject({ itemId: "tile-1", bucket: "eodata", key: "auxdata/CopDEM_COG/copernicus-dem-30m/tile-1.tif" });
    const result = await client.ingest({
      asset: assets[0]!, datasetVersion: "cop-dem-glo-30-2024-1", licenseVersion: "COPDEM-30-FFO-fixture",
      maxBytes: 1024, expectedSha256: sha256, fetchedAt: "2026-08-12T12:00:00Z",
      sink: { begin: async () => ({
        write: async (chunk) => { writes.push(chunk); },
        commit: async () => ({ stored: true, versionId: "raw-version-1" }),
        abort: async () => undefined,
      }) },
    });
    expect(Buffer.concat(writes.map((chunk) => Buffer.from(chunk))).toString("utf8")).toBe("copernicus-dem-cog");
    expect(result).toMatchObject({ itemId: "tile-1", sourceBucket: "eodata", sha256 });
  });

  it("uses OMM JSON, accepts six-digit catalog ids, and never retries a non-200 CelesTrak response", async () => {
    let calls = 0;
    const client = new CelesTrakOmmClient({ transport: async (input) => {
      calls += 1;
      const url = new URL(input.toString());
      expect(url.searchParams.get("FORMAT")).toBe("JSON");
      return response([{ OBJECT_NAME: "FIXTURE", NORAD_CAT_ID: 123456, EPOCH: "2026-08-12T12:00:00Z" }]);
    } });
    const result = await client.load();
    expect(result).toMatchObject({ format: "OMM-JSON", minimumRefreshSeconds: 7_200 });
    expect(result.records[0].NORAD_CAT_ID).toBe(123456);
    expect(calls).toBe(1);

    const failing = new CelesTrakOmmClient({ transport: async () => { calls += 1; return response("blocked", 503); } });
    await expect(failing.load()).rejects.toThrow("celestrak-omm_http_503");
    expect(calls).toBe(2);
  });
});
