/** Pure contract shared by official text acquisition and offline source preflight. */
export function entityBatchUrl(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || new Set(ids).size !== ids.length ||
      ids.some(id => !/^Q[1-9]\d*$/u.test(id))) throw Error("introduction_entity_ids_invalid");
  const url = new URL("https://www.wikidata.org/w/api.php");
  for (const [key, value] of Object.entries({ action: "wbgetentities", format: "json", ids: ids.join("|"),
    props: "info|claims|labels|sitelinks", languages: "en|zh|zh-cn|zh-hans", sitefilter: "enwiki|zhwiki", maxlag: "5" }))
    url.searchParams.set(key, value);
  return url.href;
}

/** Curl's write-out is evidence, not trusted JSON. A malformed/truncated
 * transport receipt must still let the collector preserve a failure result. */
export function textTransportReceipt(result) {
  const base = { exitCode: result?.status ?? null, stderr: String(result?.stderr ?? ""), error: result?.error?.message ?? null };
  try {
    const value = JSON.parse(String(result?.stdout ?? ""));
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        !Number.isInteger(value.httpStatus) || value.httpStatus < 0 || value.httpStatus > 599 ||
        typeof value.effectiveUrl !== "string" ||
        !Number.isFinite(value.downloadedBytes) || value.downloadedBytes < 0 ||
        !Number.isFinite(value.wallSeconds) || value.wallSeconds < 0 ||
        value.retryAfter !== undefined && typeof value.retryAfter !== "string") throw Error("invalid");
    return { ...base, httpStatus: value.httpStatus, effectiveUrl: value.effectiveUrl,
      downloadedBytes: value.downloadedBytes, wallSeconds: value.wallSeconds, retryAfter: value.retryAfter ?? "",
      transportMetadata: "VALID" };
  } catch {
    return { ...base, httpStatus: null, effectiveUrl: null, downloadedBytes: null, wallSeconds: null, retryAfter: "",
      error: base.error ?? "text_transport_metadata_invalid", transportMetadata: "INVALID" };
  }
}
