import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  acquireStreamingImmutableArtifact,
  assertHttpsHost,
  requestJson,
  type HeadersLike,
  type HttpTransport,
  type ResponseLike,
  type StagedImmutableRawSink,
} from "../../packages/data-source-runtime/src/index";

const COLLECTION = "cop-dem-glo-30-dged-cog";
const BUCKET = "eodata";

interface StacAsset { href?: string; type?: string; roles?: string[] }
interface StacItem { id?: string; assets?: Record<string, StacAsset> }
interface StacFeatureCollection { features?: StacItem[] }

export interface CopernicusDemAsset {
  itemId: string;
  bucket: "eodata";
  key: string;
  mediaType: string | null;
}

interface S3Reader {
  send(command: unknown): Promise<Record<string, any>>;
}

function keyFromHref(href: string): string {
  const prefix = `s3://${BUCKET}/`;
  if (!href.startsWith(prefix)) throw new Error("copernicus_dem_asset_not_eodata_s3");
  const key = href.slice(prefix.length);
  if (!key || key.includes("\\") || key.split("/").some((segment) => segment === ".." || segment === ".")) throw new Error("copernicus_dem_s3_key_invalid");
  return key;
}

function encodedObjectUrl(endpoint: URL, key: string): URL {
  return new URL(`${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`, endpoint);
}

export class CopernicusDemIngestClient {
  private readonly catalogUrl: URL;
  private readonly s3Endpoint: URL;
  private readonly s3: S3Reader;

  constructor(private readonly options: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    catalogEndpoint?: string;
    s3Endpoint?: string;
    catalogTransport?: HttpTransport;
    s3Client?: S3Reader;
  }) {
    if (!options.accessKeyId || !options.secretAccessKey) throw new Error("cdse_s3_credentials_required");
    this.catalogUrl = new URL(options.catalogEndpoint ?? "https://stac.dataspace.copernicus.eu/v1/");
    this.s3Endpoint = new URL(options.s3Endpoint ?? "https://eodata.dataspace.copernicus.eu/");
    assertHttpsHost(this.catalogUrl, ["stac.dataspace.copernicus.eu"]);
    assertHttpsHost(this.s3Endpoint, ["eodata.dataspace.copernicus.eu", "eodata.ams.dataspace.copernicus.eu"]);
    this.s3 = options.s3Client ?? new S3Client({
      endpoint: this.s3Endpoint.toString(),
      region: "default",
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        sessionToken: options.sessionToken,
      },
      forcePathStyle: true,
      followRegionRedirects: false,
    }) as unknown as S3Reader;
  }

  async selectAssets(input: { ids?: string[]; bbox?: [number, number, number, number]; limit?: number }): Promise<CopernicusDemAsset[]> {
    if (!input.ids?.length && !input.bbox) throw new Error("copernicus_dem_ids_or_bbox_required");
    const limit = Math.min(100, Math.max(1, input.limit ?? input.ids?.length ?? 20));
    const payload = await requestJson<StacFeatureCollection>({
      provider: "copernicus-dem-stac",
      url: new URL("search", this.catalogUrl),
      init: {
        method: "POST",
        headers: { accept: "application/geo+json", "content-type": "application/json" },
        body: JSON.stringify({ collections: [COLLECTION], ids: input.ids, bbox: input.bbox, limit }),
      },
      transport: this.options.catalogTransport,
      maxAttempts: 2,
    });
    const items = payload.features ?? [];
    if (!items.length) throw new Error("copernicus_dem_stac_empty");
    return items.map((item) => {
      const asset = item.assets?.data;
      if (!item.id || !asset?.href) throw new Error("copernicus_dem_stac_asset_incomplete");
      return { itemId: item.id, bucket: BUCKET, key: keyFromHref(asset.href), mediaType: asset.type ?? null };
    });
  }

  async ingest(input: {
    asset: CopernicusDemAsset;
    datasetVersion: string;
    licenseVersion: string;
    maxBytes: number;
    expectedSha256?: string;
    fetchedAt: string;
    sink: StagedImmutableRawSink;
  }) {
    if (input.asset.bucket !== BUCKET) throw new Error("copernicus_dem_bucket_invalid");
    const output = await this.s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: input.asset.key }));
    const body = output.Body as AsyncIterable<Uint8Array> | undefined;
    if (!body || !(Symbol.asyncIterator in Object(body))) throw new Error("copernicus_dem_s3_body_not_streaming");
    const objectUrl = encodedObjectUrl(this.s3Endpoint, input.asset.key);
    const headers: HeadersLike = { get(name) {
      if (name.toLowerCase() === "content-length") return output.ContentLength === undefined ? null : String(output.ContentLength);
      if (name.toLowerCase() === "etag") return output.ETag === undefined ? null : String(output.ETag);
      return null;
    } };
    const response: ResponseLike = {
      ok: true,
      status: 200,
      headers,
      url: objectUrl.toString(),
      body,
      json: async () => { throw new Error("copernicus_dem_s3_not_json"); },
      arrayBuffer: async () => { throw new Error("copernicus_dem_s3_stream_required"); },
    };
    const result = await acquireStreamingImmutableArtifact({
      source: "copernicus-dem",
      datasetVersion: input.datasetVersion,
      url: objectUrl,
      allowedHosts: ["eodata.dataspace.copernicus.eu", "eodata.ams.dataspace.copernicus.eu"],
      licenseVersion: input.licenseVersion,
      expectedSha256: input.expectedSha256,
      maxBytes: input.maxBytes,
      sink: input.sink,
      transport: async () => response,
      fetchedAt: input.fetchedAt,
    });
    return { ...result, itemId: input.asset.itemId, sourceBucket: BUCKET, sourceKey: input.asset.key };
  }
}
