import assert from "node:assert/strict";
import test from "node:test";
import { articleUrl, decodeEventArticleHtml, extractEventArticle, isPublicArticleAddress, resolveArticleDestination, EVENT_ARTICLE_HTML_BYTES } from "./event-article-extraction.ts";

const paragraphs = [
  "这份流星雨观测资料介绍如何选择视野开阔的场地。观测前应核对天气、月光与现场通行条件，不能只根据目录中的参考日期决定行程。",
  "流星可能出现在天空不同位置。保留足够的暗适应时间，并且不要用普通太阳镜观测太阳。本段没有提供当年极大时刻或预测流量。",
];
function article(extra = "") {
  return `<html><head><meta charset="utf-8"><title>流星雨观测资料</title><meta name="author" content="资料编辑"><meta property="article:published_time" content="2026-09-15"></head><body><nav>无关菜单</nav><article><h1>流星雨观测资料</h1>${paragraphs.map(value => `<p>${value}</p>`).join("")}${extra}</article></body></html>`;
}

test("readability extracts actual paragraphs and preserves date-only precision without executing input", () => {
  const result = extractEventArticle(article('<script>document.title="脚本已执行";document.querySelector("article").innerHTML="被脚本替换的内容";</script><img src="http://127.0.0.1/private.png">'), "https://example.org/meteors#section", new Date("2026-09-15T01:00:00Z"));
  assert.equal(result.title, "流星雨观测资料");
  assert.equal(result.authorName, "资料编辑");
  assert.equal(result.publishedTime, "2026-09-15");
  assert.ok(paragraphs.every(value => result.paragraphs.includes(value)));
  assert.equal(result.omittedMediaCount, 1);
  assert.equal(result.sourceUrl, "https://example.org/meteors");
  assert.doesNotMatch(result.paragraphs.join(""), /脚本已执行|被脚本替换|无关菜单|<script/);
  assert.match(result.contentSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.retrievedAt, "2026-09-15T01:00:00.000Z");
});

test("missing, overlarge, malformed and media-only text is not reported as a complete article", () => {
  assert.throws(() => extractEventArticle('<html><title>海报</title><article><img src="https://example.org/poster.jpg"></article></html>', "https://example.org/poster"), /no_readable_content/);
  assert.throws(() => extractEventArticle("<html><title>登录</title><p>请登录</p></html>", "https://example.org/private"), /no_readable_content/);
  assert.throws(() => extractEventArticle(Buffer.alloc(EVENT_ARTICLE_HTML_BYTES + 1), "https://example.org/large"), /too_large/);
  assert.throws(() => extractEventArticle(article(`<p>${"文字".repeat(21_000)}</p>`), "https://example.org/long"), /text_too_large/);
  assert.throws(() => extractEventArticle(article("<p>无法解码\uFFFD</p>"), "https://example.org/bad"), /no_readable_content/);
});

test("nested block boundaries preserve parent text before and after children in original order", () => {
  const result = extractEventArticle(article("<blockquote>引用前面的限制。<p>引用内部的正文。</p>引用结束后的限制。</blockquote><ul><li>父级前言。<ul><li>子级事项。</li></ul>父级结尾。</li></ul>"), "https://example.org/nested");
  const body = result.paragraphs.join("\n");
  assert.match(body, /引用前面的限制。\n引用内部的正文。\n引用结束后的限制。/);
  assert.match(body, /父级前言。\n子级事项。\n父级结尾。/);
});

test("HTTP-only charset is honored and manual Unicode HTML does not need a meta declaration", () => {
  const html = article().replace('<meta charset="utf-8">', "");
  assert.ok(extractEventArticle(Buffer.from(html), "https://example.org/http-charset", new Date(), "text/html;charset=utf-8").paragraphs.includes(paragraphs[0]!));
  assert.ok(extractEventArticle(html, "https://example.org/paste").paragraphs.includes(paragraphs[0]!));
});

test("HTML file upload keeps original GB2312 bytes instead of prematurely decoding UTF-8", () => {
  const chinese = Buffer.from("c1f7d0c7d3ea", "hex"); // 流星雨 in GB2312
  const bytes = Buffer.concat([Buffer.from('<html><head><meta charset="gb2312"><title>'), chinese, Buffer.from('</title></head><body><article><p>'), chinese,
    Buffer.from(' observation needs clear skies, a permitted location and time for eyes to adapt to darkness. This paragraph does not provide a forecast.</p></article></body></html>')]);
  const uploaded = decodeEventArticleHtml(bytes.toString("base64"));
  assert.deepEqual(uploaded, bytes);
  assert.equal(extractEventArticle(uploaded, "https://example.org/gb2312").title, "流星雨");
  assert.throws(() => extractEventArticle(bytes.toString("utf8"), "https://example.org/bad"), /no_readable_content/);
  assert.throws(() => decodeEventArticleHtml("not base64!"), /html_invalid/);
});

test("URL and DNS validation reject internal, reserved and mixed answers including IPv4-mapped IPv6", async () => {
  for (const value of ["http://example.org/page", "https://user:password@example.org/", "https://127.0.0.1/", "https://0x7f000001/", "https://[::1]/", "https://example.org:8443/"])
    assert.throws(() => articleUrl(value), /url_invalid/);
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.0.1", "224.0.0.1", "192.0.2.1", "::1", "fe80::1", "fd00::1", "2001:db8::1", "::ffff:192.168.1.2"])
    assert.equal(isPublicArticleAddress(address), false, address);
  assert.equal(isPublicArticleAddress("8.8.8.8"), true);
  const mixed = async () => [{ address: "8.8.8.8", family: 4 }, { address: "10.0.0.1", family: 4 }];
  await assert.rejects(() => resolveArticleDestination(articleUrl("https://example.org/"), mixed), /not_public/);
  const publicOnly = async () => [{ address: "8.8.8.8", family: 4 }];
  assert.deepEqual(await resolveArticleDestination(articleUrl("https://example.org/"), publicOnly), { address: "8.8.8.8", family: 4 });
});
