import type { SourceSummary } from "./types.ts";

/** An ID identifies the source, not every acquisition, validity or credit record. */
export function uniqueSourceRecords(sources: readonly SourceSummary[]) {
  const seen = new Set<string>();
  return sources.filter(source => {
    const record = {
      id: source.id, kind: source.kind, provider: source.provider, title: source.title,
      sourceUrl: source.sourceUrl, license: source.license, licenseUrl: source.licenseUrl,
      publishedAt: source.publishedAt, retrievedAt: source.retrievedAt,
      validFrom: source.validFrom, validTo: source.validTo, state: source.state,
      confidence: source.confidence, precision: source.precision, limitations: source.limitations,
      attribution: source.attribution ? {
        name: source.attribution.name, url: source.attribution.url, statements: source.attribution.statements,
      } : undefined,
    } satisfies Record<keyof SourceSummary, unknown>;
    const key = JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
