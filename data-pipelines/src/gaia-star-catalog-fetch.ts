/** Official Gaia TAP acquisition; never used by runtime product code. */

import {
  GAIA_DR3_ADQL,
  GAIA_DR3_TAP_URL,
} from "../../packages/astronomy-core/src/gaia-catalog-data.ts";
import { fail } from "./gaia-star-catalog-errors.ts";

export async function fetchGaiaDr3Csv(
  fetchImpl: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; retrievedAt: string }> {
  const sourceUrl = `${GAIA_DR3_TAP_URL}?REQUEST=doQuery&LANG=ADQL&FORMAT=csv&QUERY=${encodeURIComponent(GAIA_DR3_ADQL)}`;
  const retrievedAt = new Date().toISOString();
  const response = await fetchImpl(sourceUrl, {
    method: "GET",
    redirect: "error",
    headers: { accept: "text/csv" },
  });
  if (!response.ok) fail(`tap_http_${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) fail("tap_response_empty");
  return { bytes, retrievedAt };
}
