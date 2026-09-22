import assert from "node:assert/strict";
import test from "node:test";
import { lookup } from "node:dns/promises";
import { createEventArticleResolver } from "./event-article-dns.ts";
import { resolveArticleDestination } from "./event-article-extraction.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import type { ArgumentsHost } from "@nestjs/common";

const url = new URL("https://example.org/article");
const options = { all: true as const };
function wire(make: (type: number) => unknown): typeof fetch {
  return (async (input, init) => {
    const query = new URL(String(input));
    assert.equal(query.origin, "https://cloudflare-dns.com");
    assert.equal(query.pathname, "/dns-query");
    assert.equal(query.searchParams.get("name"), "example.org");
    assert.equal(query.searchParams.get("cd"), "false");
    assert.equal(init?.redirect, "error");
    const type = Number(query.searchParams.get("type"));
    return new Response(JSON.stringify(make(type)), { headers: { "content-type": "application/dns-json" } });
  }) as typeof fetch;
}
const answer = (type: number, data = type === 1 ? "8.8.8.8" : "2606:4700:4700::1111") => ({
  Status: 0, TC: false, Question: [{ name: "example.org.", type }], Answer: [{ type, data }],
});

test("explicit resolver selection preserves system default; DoH returns checked public dual-family answers", async () => {
  assert.equal(createEventArticleResolver("SYSTEM"), lookup);
  assert.throws(() => createEventArticleResolver("arbitrary" as never), /dns_mode_invalid/);
  const resolver = createEventArticleResolver("CLOUDFLARE_DOH", wire(type => answer(type)));
  assert.deepEqual(await resolver(url.hostname, options), [{ address: "8.8.8.8", family: 4 }, { address: "2606:4700:4700::1111", family: 6 }]);
  assert.deepEqual(await resolveArticleDestination(url, resolver), { address: "8.8.8.8", family: 4 });
});

test("IPv4-only NODATA is valid; any private result in either family rejects the destination", async () => {
  const v4 = createEventArticleResolver("CLOUDFLARE_DOH", wire(type => ({ ...answer(type), Answer: type === 1 ? answer(type).Answer : [] })));
  assert.equal((await resolveArticleDestination(url, v4)).address, "8.8.8.8");
  for (const privateAddress of ["127.0.0.1", "198.18.1.1", "10.0.0.1", "::1", "::ffff:127.0.0.1"]) {
    const family = privateAddress.includes(":") ? 28 : 1;
    const resolver = createEventArticleResolver("CLOUDFLARE_DOH", wire(type => type === family ? answer(type, privateAddress) : answer(type)));
    await assert.rejects(resolveArticleDestination(url, resolver), /destination_not_public/);
  }
});

test("DoH rejects partial query failure, truncation, mismatched question and malformed addresses", async () => {
  for (const change of [
    { Status: 2 }, { TC: true }, { Question: [{ name: "other.org.", type: 28 }] },
    { Question: [{ name: "example.org.", type: 1 }] }, { Answer: [{ type: 28, data: "8.8.8.8" }] },
  ]) {
    const resolver = createEventArticleResolver("CLOUDFLARE_DOH", wire(type => ({ ...answer(type), ...(type === 28 ? change : {}) })));
    await assert.rejects(resolveArticleDestination(url, resolver), /dns_unavailable/);
  }
});

test("DoH bounds streamed bytes and aborts the sibling request on failure", async () => {
  let cancelled = 0;
  let siblingAborted = false;
  const transport = (async (input, init) => {
    if (new URL(String(input)).searchParams.get("type") === "28") return new Promise((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => { siblingAborted = true; reject(new Error("aborted")); }, { once: true });
    });
    return new Response(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(40_000)); }, cancel() { cancelled++; } }), { headers: { "content-type": "application/dns-json" } });
  }) as typeof fetch;
  await assert.rejects(createEventArticleResolver("CLOUDFLARE_DOH", transport)(url.hostname, options), /dns_unavailable/);
  assert.equal(cancelled, 1);
  assert.equal(siblingAborted, true);
});

test("article deadline is propagated to both DoH requests", async () => {
  const controller = new AbortController(); let aborted = 0;
  const transport = ((_input, init) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener("abort", () => { aborted++; reject(new Error("aborted")); }, { once: true });
  })) as typeof fetch;
  const pending = createEventArticleResolver("CLOUDFLARE_DOH", transport)(url.hostname, options, controller.signal);
  controller.abort();
  await assert.rejects(pending, /timeout/);
  assert.equal(aborted, 2);
});

test("invalid HTTP status or response type cancels bodies without interpreting them as DNS", async () => {
  for (const [status, type] of [[302, "application/dns-json"], [503, "application/dns-json"], [200, "text/html"]] as const) {
    let cancelled = 0;
    const transport = (async () => new Response(new ReadableStream({ cancel() { cancelled++; } }), { status, headers: { "content-type": type } })) as typeof fetch;
    await assert.rejects(createEventArticleResolver("CLOUDFLARE_DOH", transport)(url.hostname, options), /dns_unavailable/);
    assert.equal(cancelled, 2);
  }
});

test("DNS service failure yields retryable HTTP recovery while private destinations remain invalid input", async () => {
  const unavailable = createEventArticleResolver("CLOUDFLARE_DOH", (async () => new Response(null, { status: 503 })) as typeof fetch);
  const privateDestination = createEventArticleResolver("CLOUDFLARE_DOH", wire(type => answer(type, type === 1 ? "127.0.0.1" : "::1")));
  for (const [resolver, expectedStatus, expectedCode, retryable] of [
    [unavailable, 503, "PROVIDER_UNAVAILABLE", true],
    [privateDestination, 400, "INVALID_INPUT", false],
  ] as const) {
    let failure: unknown;
    try { await resolveArticleDestination(url, resolver); } catch (error) { failure = error; }
    assert.ok(failure instanceof Error);
    let status = 0; let payload: { code: string; retryable: boolean; recovery: string[] } | undefined;
    const response = { status(value: number) { status = value; return this; }, send(value: typeof payload) { payload = value; } };
    const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ headers: {} }) }) } as unknown as ArgumentsHost;
    new ApiExceptionFilter().catch(failure, host);
    assert.equal(status, expectedStatus);
    assert.equal(payload?.code, expectedCode);
    assert.equal(payload?.retryable, retryable);
    assert.equal(payload?.recovery.includes("RETRY"), retryable);
  }
});
