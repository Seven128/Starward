import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import type { LookupAddress, LookupAllOptions } from "node:dns";
import { request } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import { validateExternalUrl } from "@starward/miniapp-contracts";

export const EVENT_ARTICLE_PARSER = "mozilla-readability-0.6.0-plain.v1";
export const EVENT_ARTICLE_HTML_BYTES = 2 * 1024 * 1024;
export const EVENT_ARTICLE_MAX_TEXT = 40_000;

export function decodeEventArticleHtml(encoded: unknown): Buffer {
  if (typeof encoded !== "string" || encoded.length > Math.ceil(EVENT_ARTICLE_HTML_BYTES / 3) * 4
    || encoded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/u.test(encoded)) throw new Error("event_article_html_invalid");
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.byteLength > EVENT_ARTICLE_HTML_BYTES) throw new Error("event_article_too_large");
  if (bytes.toString("base64") !== encoded) throw new Error("event_article_html_invalid");
  return bytes;
}

export interface ExtractedEventArticle {
  sourceUrl: string;
  title: string;
  authorName: string | null;
  /** Preserve the publisher's precision; an unzoned date is not an exact instant. */
  publishedTime: string | null;
  paragraphs: string[];
  omittedMediaCount: number;
  contentSha256: string;
  retrievedAt: string;
  parserVersion: typeof EVENT_ARTICLE_PARSER;
}

export function articleUrl(raw: string): URL {
  const validation = validateExternalUrl(raw);
  if (!validation.ok || !validation.normalizedUrl) throw new Error("event_article_url_invalid");
  const url = new URL(validation.normalizedUrl);
  if (url.protocol !== "https:" || url.port || isIP(url.hostname.replace(/^\[|\]$/gu, "")))
    throw new Error("event_article_url_invalid");
  return url;
}

export function isPublicArticleAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}

/** Resolve once, validate every answer, and connect only to that validated answer. */
export type ArticleResolver = (hostname: string, options: LookupAllOptions, signal?: AbortSignal) => Promise<LookupAddress[]>;
export async function resolveArticleDestination(url: URL, resolve: ArticleResolver = lookup, signal?: AbortSignal) {
  const answers = await resolve(url.hostname, { all: true, verbatim: true }, signal);
  if (!answers.length || answers.some(answer => !isPublicArticleAddress(answer.address)))
    throw new Error("event_article_destination_not_public");
  return answers.find(answer => answer.family === 4) ?? answers[0]!;
}

async function readArticleHtml(url: URL, resolveDns: ArticleResolver = lookup): Promise<{ bytes: Buffer; contentType: string }> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 10_000);
  timeout.unref();
  let cancelLookup: (() => void) | undefined;
  try {
    const answer = await Promise.race([
      resolveArticleDestination(url, resolveDns, abort.signal),
      new Promise<never>((_, reject) => {
        cancelLookup = () => reject(new Error("event_article_timeout"));
        abort.signal.addEventListener("abort", cancelLookup, { once: true });
      }),
    ]);
    if (cancelLookup) abort.signal.removeEventListener("abort", cancelLookup);
    abort.signal.throwIfAborted();
    return await new Promise<{ bytes: Buffer; contentType: string }>((resolve, reject) => {
      const req = request(url, {
        method: "GET", agent: false, signal: abort.signal,
        servername: url.hostname,
        lookup: (_hostname, options, callback) => {
          // Node may ask for all answers when autoSelectFamily is enabled.
          if (typeof options === "object" && options.all) callback(null, [answer] as never);
          else callback(null, answer.address, answer.family);
        },
        headers: { accept: "text/html,application/xhtml+xml", "accept-encoding": "identity", "user-agent": "Starward-Article-Import/1.0" },
      }, response => {
        const fail = (code: string) => { response.destroy(); req.destroy(); reject(new Error(code)); };
        if (response.statusCode !== 200) { fail("event_article_source_unavailable"); return; }
        if (!/^(text\/html|application\/xhtml\+xml)(?:;|$)/iu.test(response.headers["content-type"] ?? "")) {
          fail("event_article_content_type_invalid"); return;
        }
        if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") {
          fail("event_article_encoding_unsupported"); return;
        }
        if (Number(response.headers["content-length"] ?? 0) > EVENT_ARTICLE_HTML_BYTES) { fail("event_article_too_large"); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.byteLength;
          if (size > EVENT_ARTICLE_HTML_BYTES) fail("event_article_too_large");
          else chunks.push(chunk);
        });
        response.on("error", () => reject(new Error("event_article_source_unavailable")));
        response.on("end", () => response.complete ? resolve({ bytes: Buffer.concat(chunks), contentType: response.headers["content-type"]! }) : reject(new Error("event_article_source_unavailable")));
      });
      req.on("error", () => reject(new Error(abort.signal.aborted ? "event_article_timeout" : "event_article_source_unavailable")));
      req.end();
    });
  } finally {
    clearTimeout(timeout);
    if (cancelLookup) abort.signal.removeEventListener("abort", cancelLookup);
  }
}

const clean = (value: string) => value.replace(/[\t\r\n ]+/gu, " ").trim();

/** Plain text only. Neither this parser nor its returned result runs page scripts or loads media. */
export function extractEventArticle(html: Buffer | string, sourceUrl: string, now = new Date(), contentType = "text/html"): ExtractedEventArticle {
  const url = articleUrl(sourceUrl);
  const bytes = typeof html === "string" ? Buffer.from(html, "utf8") : html;
  if (bytes.byteLength > EVENT_ARTICLE_HTML_BYTES) throw new Error("event_article_too_large");
  // Buffer input lets jsdom honor the document charset/BOM. Remote resources and runScripts stay disabled.
  const dom = new JSDOM(bytes, { url: url.href, contentType: typeof html === "string" ? "text/html;charset=utf-8" : contentType, virtualConsole: new VirtualConsole() });
  try {
    const document = dom.window.document;
    if (document.querySelectorAll("*").length > 20_000) throw new Error("event_article_too_complex");
    const parsed = new Readability(document, { maxElemsToParse: 20_000, charThreshold: 80,
      serializer: element => element as Element,
    }).parse();
    if (!parsed?.title?.trim()) throw new Error("event_article_no_readable_content");
    const root = parsed.content;
    if (!root) throw new Error("event_article_no_readable_content");
    const omittedMediaCount = root.querySelectorAll("img,svg,video,audio,iframe,canvas,table").length;
    root.querySelectorAll("script,style,noscript,form,button,input,iframe,svg,canvas,table,img,video,audio").forEach(element => element.remove());
    const paragraphs: string[] = [];
    let fragment = "";
    const flush = () => { const text = clean(fragment); if (text) paragraphs.push(text); fragment = ""; };
    const walk = (node: Node) => {
      if (node.nodeType === 3) { fragment += node.textContent ?? ""; return; }
      const block = /^(?:P|H[1-6]|LI|BLOCKQUOTE|PRE|DIV|SECTION|ARTICLE|BR)$/u.test(node.nodeName);
      if (block) flush();
      for (const child of Array.from(node.childNodes)) walk(child);
      if (block) flush();
    };
    walk(root); flush();
    const length = paragraphs.reduce((total, paragraph) => total + paragraph.length, 0);
    if (length < 40 || paragraphs.some(paragraph => paragraph.includes("\uFFFD"))) throw new Error("event_article_no_readable_content");
    if (length > EVENT_ARTICLE_MAX_TEXT || paragraphs.length > 500) throw new Error("event_article_text_too_large");
    return {
      sourceUrl: url.href, title: clean(parsed.title), authorName: parsed.byline ? clean(parsed.byline) : null,
      publishedTime: parsed.publishedTime?.trim() || null, paragraphs, omittedMediaCount,
      contentSha256: createHash("sha256").update(bytes).digest("hex"), retrievedAt: now.toISOString(), parserVersion: EVENT_ARTICLE_PARSER,
    };
  } finally { dom.window.close(); }
}

export async function retrieveEventArticle(sourceUrl: string, resolveDns: ArticleResolver = lookup): Promise<ExtractedEventArticle> {
  const url = articleUrl(sourceUrl);
  const input = await readArticleHtml(url, resolveDns);
  return extractEventArticle(input.bytes, url.href, new Date(), input.contentType);
}
