import { acquireStreamingImmutableArtifact, type HttpTransport, type StagedImmutableRawSink } from "../../packages/data-source-runtime/src/index";

export type StaticSourceId = "eog-viirs-vnl" | "copernicus-dem" | "gaia-dr3" | "nsmc-fy4-landing";

export interface StaticSourceIngestRequest {
  source: StaticSourceId;
  datasetVersion: string;
  objectUrl: string;
  expectedSha256?: string;
  licenseVersion: string;
  maxBytes: number;
  fetchedAt: string;
}

const SOURCE_HOSTS: Record<StaticSourceId, readonly string[]> = {
  "eog-viirs-vnl": ["eogdata.mines.edu"],
  "copernicus-dem": ["eodata.dataspace.copernicus.eu", "eodata.ams.dataspace.copernicus.eu", "download.dataspace.copernicus.eu"],
  "gaia-dr3": ["cdn.gea.esac.esa.int", "gea.esac.esa.int"],
  "nsmc-fy4-landing": ["data.nsmc.org.cn"],
};

/**
 * The same immutable landing contract is used for public HTTP/S3 downloads and
 * for FY-4 files placed behind a short-lived approved order URL. The worker never
 * scrapes a public viewer, invents a hidden API, or bypasses account/order limits.
 */
export async function ingestStaticSource(request: StaticSourceIngestRequest, dependencies: { sink: StagedImmutableRawSink; transport?: HttpTransport; init?: RequestInit }) {
  return acquireStreamingImmutableArtifact({
    source: request.source,
    datasetVersion: request.datasetVersion,
    url: new URL(request.objectUrl),
    allowedHosts: SOURCE_HOSTS[request.source],
    licenseVersion: request.licenseVersion,
    expectedSha256: request.expectedSha256,
    maxBytes: request.maxBytes,
    sink: dependencies.sink,
    transport: dependencies.transport,
    init: dependencies.init,
    fetchedAt: request.fetchedAt,
  });
}
