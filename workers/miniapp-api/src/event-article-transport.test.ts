import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { RequestOptions } from "node:https";
import type { IncomingMessage } from "node:http";
import { retrieveEventArticle, EVENT_ARTICLE_HTML_BYTES } from "./event-article-extraction.ts";

const html = '<html><title>观测资料</title><article><p>观测前核对天气和场地许可，选择视野开阔的位置并保留暗适应时间。不要根据常年日期或文章内容推断当前场地允许进入。</p></article></html>';
const publicAnswer = [{ address: "8.8.8.8", family: 4 }];

/** Controlled response streams at the HTTPS boundary; this does not establish external reachability. */
function transport(t: TestContext, options: { status?: number; headers?: Record<string, string>; body?: Buffer[]; incomplete?: boolean; stall?: boolean } = {}) {
  let requests = 0;
  let destroyed = false;
  let actualOptions: RequestOptions | undefined;
  let sentChunks = 0;
  t.mock.method(https, "request", (_url: URL, requestOptions: RequestOptions, callback: (response: IncomingMessage) => void) => {
    requests++;
    actualOptions = requestOptions;
    const req = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
    const response = Object.assign(new PassThrough(), { statusCode: options.status ?? 200,
      headers: { "content-type": "text/html;charset=utf-8", ...options.headers }, complete: !options.incomplete });
    req.destroy = () => { destroyed = true; response.destroy(); };
    const abort = () => { req.destroy(); req.emit("error", new Error("aborted")); };
    requestOptions.signal?.addEventListener("abort", abort, { once: true });
    t.after(() => requestOptions.signal?.removeEventListener("abort", abort));
    req.end = () => queueMicrotask(() => {
      callback(response as unknown as IncomingMessage);
      if (destroyed || options.stall) return;
      for (const bytes of options.body ?? [Buffer.from(html)]) {
        if (destroyed) break;
        sentChunks++;
        response.write(bytes);
      }
      if (!destroyed) response.end();
    });
    return req;
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  return { state: () => ({ requests, destroyed, actualOptions, sentChunks }) };
}

test("HTTPS request pins the single checked DNS result and preserves real extracted text", async t => {
  const wire = transport(t);
  let resolutions = 0;
  const result = await retrieveEventArticle("https://example.org/article", async () => { resolutions++; return publicAnswer; });
  assert.equal(result.title, "观测资料");
  assert.match(result.paragraphs.join(""), /不要根据常年日期或文章内容推断当前场地允许进入/);
  assert.equal(resolutions, 1);
  const options = wire.state().actualOptions!;
  assert.equal(options.servername, "example.org");
  assert.equal(options.agent, false);
  const lookup = options.lookup as Function;
  lookup("example.org", {}, (error: unknown, address: string, family: number) => {
    assert.equal(error, null); assert.equal(address, publicAnswer[0]!.address); assert.equal(family, 4);
  });
  lookup("example.org", { all: true }, (error: unknown, answers: unknown) => { assert.equal(error, null); assert.deepEqual(answers, publicAnswer); });
});

test("redirect, unsupported content and encoded bodies are rejected without a second request", async t => {
  for (const [options, code] of [
    [{ status: 302, headers: { location: "http://127.0.0.1/private" } }, /source_unavailable/],
    [{ headers: { "content-type": "application/pdf" } }, /content_type_invalid/],
    [{ headers: { "content-encoding": "gzip" } }, /encoding_unsupported/],
  ] as const) await t.test(String(code), async child => {
    const wire = transport(child, options);
    await assert.rejects(retrieveEventArticle("https://example.org/article", async () => publicAnswer), code);
    assert.equal(wire.state().requests, 1); assert.equal(wire.state().destroyed, true);
    assert.equal(wire.state().sentChunks, 0);
  });
});

test("declared and streamed oversize bodies stop retrieval before extraction", async t => {
  await t.test("declared length", async child => {
    const wire = transport(child, { headers: { "content-length": String(EVENT_ARTICLE_HTML_BYTES + 1) } });
    await assert.rejects(retrieveEventArticle("https://example.org/article", async () => publicAnswer), /too_large/);
    assert.equal(wire.state().sentChunks, 0); assert.equal(wire.state().destroyed, true);
  });
  await t.test("chunked length", async child => {
    const wire = transport(child, { body: [Buffer.alloc(EVENT_ARTICLE_HTML_BYTES), Buffer.alloc(1), Buffer.from(html)] });
    await assert.rejects(retrieveEventArticle("https://example.org/article", async () => publicAnswer), /too_large/);
    assert.equal(wire.state().sentChunks, 2); assert.equal(wire.state().destroyed, true);
  });
});

test("a truncated body cannot yield a valid-looking partial article", async t => {
  transport(t, { incomplete: true });
  await assert.rejects(retrieveEventArticle("https://example.org/article", async () => publicAnswer), /source_unavailable/);
});

test("one ten-second deadline covers both DNS lookup and a stalled response body", async t => {
  await t.test("DNS", async child => {
    child.mock.timers.enable({ apis: ["setTimeout"] });
    const wire = transport(child);
    const rejected = assert.rejects(retrieveEventArticle("https://example.org/article", () => new Promise(() => {})), /timeout/);
    child.mock.timers.tick(10_000);
    await rejected;
    assert.equal(wire.state().requests, 0);
  });
  await t.test("body", async child => {
    child.mock.timers.enable({ apis: ["setTimeout"] });
    const wire = transport(child, { stall: true });
    const rejected = assert.rejects(retrieveEventArticle("https://example.org/article", async () => {
      await new Promise(resolve => setTimeout(resolve, 8_000));
      return publicAnswer;
    }), /timeout/);
    child.mock.timers.tick(8_000);
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(wire.state().requests, 1);
    child.mock.timers.tick(1_999);
    assert.equal(wire.state().destroyed, false);
    child.mock.timers.tick(1);
    await rejected;
    assert.equal(wire.state().destroyed, true);
  });
});
