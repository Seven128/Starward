import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { ArticleResolver } from "./event-article-extraction.ts";
import type { EventArticleDnsMode } from "./runtime-config.ts";

const DNS_RESPONSE_BYTES = 64 * 1024;
const normalizedName = (name: string) => name.toLowerCase().replace(/\.$/u, "");

/** Explicit operator-selected resolution; never a fallback after a private answer. */
export function createEventArticleResolver(mode: EventArticleDnsMode, transport: typeof fetch = fetch): ArticleResolver {
  if (mode === "SYSTEM") return lookup;
  if (mode !== "CLOUDFLARE_DOH") throw new Error("event_article_dns_mode_invalid");
  return async (hostname, _options, parentSignal) => {
    const cancellation = new AbortController();
    const signal = AbortSignal.any([parentSignal ?? AbortSignal.timeout(10_000), cancellation.signal]);
    const query = async (type: 1 | 28) => {
      const url = new URL("https://cloudflare-dns.com/dns-query");
      url.search = new URLSearchParams({ name: hostname, type: String(type), cd: "false" }).toString();
      const response = await transport(url, { headers: { accept: "application/dns-json" }, redirect: "error", signal });
      if (response.status !== 200 || !/^application\/(?:dns-json|json)(?:;|$)/iu.test(response.headers.get("content-type") ?? "") ||
          Number(response.headers.get("content-length") ?? 0) > DNS_RESPONSE_BYTES || !response.body) {
        void response.body?.cancel().catch(() => undefined);
        throw new Error("event_article_dns_unavailable");
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > DNS_RESPONSE_BYTES) throw new Error("event_article_dns_unavailable");
          chunks.push(part.value);
        }
      } finally {
        void reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        Status?: number; TC?: boolean;
        Question?: { name?: string; type?: number }[];
        Answer?: { type?: number; data?: string }[];
      };
      if (data.Status !== 0 || data.TC === true || !Array.isArray(data.Question) || data.Question.length !== 1 ||
          typeof data.Question[0]?.name !== "string" || normalizedName(data.Question[0].name) !== normalizedName(hostname) ||
          data.Question[0].type !== type || (data.Answer !== undefined && !Array.isArray(data.Answer)))
        throw new Error("event_article_dns_unavailable");
      return (data.Answer ?? []).filter(answer => answer.type === 1 || answer.type === 28).map(answer => {
        const family = answer.type === 1 ? 4 : 6;
        if (typeof answer.data !== "string" || isIP(answer.data) !== family) throw new Error("event_article_dns_unavailable");
        return { address: answer.data, family };
      });
    };
    try { return (await Promise.all([query(1), query(28)])).flat(); }
    catch { throw new Error(signal.aborted ? "event_article_timeout" : "event_article_dns_unavailable"); }
    finally { cancellation.abort(); }
  };
}
