import { assertHttpsHost, requestJson, type HttpTransport } from "../../packages/data-source-runtime/src/index";

export interface CelesTrakOmmRecord {
  OBJECT_NAME?: string;
  OBJECT_ID?: string;
  NORAD_CAT_ID: number | string;
  EPOCH: string;
  [key: string]: unknown;
}

export class CelesTrakOmmClient {
  private readonly baseUrl = new URL("https://celestrak.org/");

  constructor(private readonly options: { transport?: HttpTransport; group?: string } = {}) {
    assertHttpsHost(this.baseUrl, ["celestrak.org"]);
  }

  async load(): Promise<{ fetchedAt: string; format: "OMM-JSON"; records: CelesTrakOmmRecord[]; minimumRefreshSeconds: 7_200 }> {
    const url = new URL("NORAD/elements/gp.php", this.baseUrl);
    url.search = new URLSearchParams({ GROUP: (this.options.group ?? "STATIONS").toUpperCase(), FORMAT: "JSON" }).toString();
    const records = await requestJson<CelesTrakOmmRecord[]>({
      provider: "celestrak-omm",
      url,
      transport: this.options.transport,
      maxAttempts: 1,
      retryStatuses: [],
      timeoutMs: 15_000,
    });
    if (!Array.isArray(records) || !records.length) throw new Error("celestrak_omm_empty");
    for (const record of records) {
      const catalogNumber = String(record.NORAD_CAT_ID ?? "");
      if (!/^\d{1,9}$/u.test(catalogNumber)) throw new Error("celestrak_catalog_number_invalid");
      if (!Number.isFinite(Date.parse(record.EPOCH))) throw new Error("celestrak_epoch_invalid");
    }
    return { fetchedAt: new Date().toISOString(), format: "OMM-JSON", records, minimumRefreshSeconds: 7_200 };
  }
}
