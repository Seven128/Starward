const fields = new Set(["attribution", "id", "kind", "provider", "title", "sourceUrl", "license", "licenseUrl", "publishedAt", "retrievedAt", "validFrom", "validTo", "state", "confidence", "precision", "limitations"]);

/** Static provenance is the public SourceSummary, never a private DB row. */
export const isPublicMapSource = source => source && typeof source === "object" && !Array.isArray(source) &&
  Object.keys(source).every(name => fields.has(name)) && (!source.attribution ||
    Object.keys(source.attribution).sort().join() === "name,statements,url");
