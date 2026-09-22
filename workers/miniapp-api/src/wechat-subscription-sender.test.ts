import assert from "node:assert/strict";
import test from "node:test";
import { WechatSubscriptionSender } from "./wechat-subscription-sender.ts";

const config = { enabled: true, templateId: "synthetic-template", fieldNames: ["thing1", "time2"], miniprogramState: "developer" as const };
const payload = { recipient: "synthetic-recipient", page: "content/plan/detail/index?planId=synthetic",
  data: { thing1: { value: "设备提醒" }, time2: { value: "2026-09-21 18:00" } } };

test("disabled or invalid payloads cannot obtain a token or send", async () => {
  const forbidden = async () => { throw new Error("must_not_call"); };
  const disabled = new WechatSubscriptionSender({ ...config, enabled: false }, forbidden, forbidden);
  assert.deepEqual(await disabled.send(payload), { state: "NOT_ATTEMPTED", reason: "DISABLED" });
  const enabled = new WechatSubscriptionSender(config, forbidden, forbidden);
  assert.deepEqual(await enabled.send({ ...payload, data: { thing1: { value: "only-one-field" } } }), { state: "NOT_ATTEMPTED", reason: "INVALID_PAYLOAD" });
  assert.deepEqual(await enabled.send({ ...payload, page: "https://unapproved.invalid/" }), { state: "NOT_ATTEMPTED", reason: "INVALID_PAYLOAD" });
});

test("runtime type mismatches fail before token acquisition", async () => {
  let tokens = 0;
  let sends = 0;
  const getToken = async () => { tokens++; return "synthetic-token"; };
  const transport: typeof fetch = async () => { sends++; return Response.json({ errcode: 0 }); };
  for (const invalidConfig of [{ ...config, templateId: undefined }, { ...config, fieldNames: null }, { ...config, fieldNames: [123] }]) {
    const sender = new WechatSubscriptionSender(invalidConfig as unknown as typeof config, getToken, transport);
    assert.deepEqual(await sender.send(payload), { state: "NOT_ATTEMPTED", reason: "INVALID_PAYLOAD" });
  }
  const sender = new WechatSubscriptionSender(config, getToken, transport);
  for (const invalid of [null, { ...payload, recipient: 123 }, { ...payload, page: null }, { ...payload, data: null }])
    assert.deepEqual(await sender.send(invalid as unknown as typeof payload), { state: "NOT_ATTEMPTED", reason: "INVALID_PAYLOAD" });
  assert.equal(tokens, 0);
  assert.equal(sends, 0);
});

test("fixed REST endpoint sends the snapshot once and distinguishes acceptance from delivery", async () => {
  let sent = 0;
  const input = structuredClone(payload);
  const sender = new WechatSubscriptionSender(config, async () => { input.data.thing1.value = "mutated"; return "synthetic-token"; }, async (url, init) => {
    sent++;
    assert.equal(new URL(String(url)).origin, "https://api.weixin.qq.com");
    assert.equal(new URL(String(url)).pathname, "/cgi-bin/message/subscribe/send");
    assert.equal(init?.redirect, "error");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.template_id, config.templateId);
    assert.equal(body.miniprogram_state, "developer");
    assert.equal(body.data.thing1.value, payload.data.thing1.value);
    return Response.json({ errcode: 0, errmsg: "ok" });
  });
  assert.deepEqual(await sender.send(input), { state: "ACCEPTED" });
  assert.equal(sent, 1);
});

test("provider rejection, ambiguous responses and network loss never retry or leak response text", async () => {
  for (const [response, expected] of [
    [() => Response.json({ errcode: 43101, errmsg: "sensitive-provider-detail" }), { state: "REJECTED", errorCode: 43101 }],
    [() => Response.json({ errcode: 47003 }), { state: "REJECTED", errorCode: 47003 }],
    [() => Response.json({ errmsg: "ok" }), { state: "UNKNOWN" }],
    [() => new Response("provider-down", { status: 503 }), { state: "UNKNOWN" }],
    [() => { throw new Error("sensitive-url-with-token"); }, { state: "UNKNOWN" }],
  ] as const) {
    let sent = 0;
    const sender = new WechatSubscriptionSender(config, async () => "synthetic-token", async () => { sent++; return response(); });
    assert.deepEqual(await sender.send(payload), expected);
    assert.equal(sent, 1);
  }
});

test("token timeout cannot cause a late send; send/body timeout is unknown", async () => {
  let resolveToken!: (token: string) => void;
  let sent = 0;
  const token = new Promise<string>(resolve => { resolveToken = resolve; });
  const sender = new WechatSubscriptionSender(config, () => token, async () => { sent++; return Response.json({ errcode: 0 }); }, 10);
  assert.deepEqual(await sender.send(payload), { state: "NOT_ATTEMPTED", reason: "TOKEN_UNAVAILABLE" });
  resolveToken("synthetic-late-token");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent, 0);
  const hangingSend = new WechatSubscriptionSender(config, async () => "synthetic-token", async () => new Promise<Response>(() => {}), 10);
  assert.deepEqual(await hangingSend.send(payload), { state: "UNKNOWN" });
  const hangingBody = new WechatSubscriptionSender(config, async () => "synthetic-token", async () => ({ ok: true, json: () => new Promise(() => {}) }) as Response, 10);
  assert.deepEqual(await hangingBody.send(payload), { state: "UNKNOWN" });
});
