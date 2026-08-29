import assert from "node:assert/strict";
import test from "node:test";
import { createDeviceFailureReporter, deviceFailureSummary } from "./device-request-diagnostic";

test("device transport summaries classify platform errors without copying sensitive text", () => {
  const cases = [
    ["request:fail url not in domain list", "domain"],
    ["request:fail ssl hand shake error", "tls"],
    ["request:fail ERR_NAME_NOT_RESOLVED", "dns"],
    ["request:fail timeout", "timeout"],
    ["request:fail connection refused", "connection"],
    ["request:fail something new", "unknown"],
  ];
  for (const [errMsg, category] of cases) {
    const output = deviceFailureSummary("transport", { errMsg: `${errMsg} https://private.invalid/?secret=private-token`, errno: 600001, errCode: -1202, header: { Authorization: "private-token" } });
    assert.match(output, new RegExp(`category=${category}\\n`));
    assert.match(output, /errno=600001\nerrCode=-1202/u);
    assert.doesNotMatch(output, /private|https|Authorization/u);
  }
  assert.match(deviceFailureSummary("transport", { errMsg: "request:fail https://certificate.invalid/timeout" }), /category=unknown/u);
});

test("unknown objects and untrusted numeric values cannot escape the fixed output", () => {
  for (const error of [null, "private-token", { errno: "secret", errCode: Infinity }, { errno: 1.5, errCode: 1e20 }, { get errMsg() { throw new Error("private"); } }]) {
    assert.equal(deviceFailureSummary("dispatch", error), "DEVICE_REQUEST_DIAGNOSTIC_V1\nstage=dispatch\ncategory=unknown\nerrno=none\nerrCode=none\nhttp=none");
  }
  assert.match(deviceFailureSummary("http", undefined, 403), /category=http[\s\S]*http=403$/u);
  assert.match(deviceFailureSummary("http", undefined, 999), /http=none$/u);
  assert.match(deviceFailureSummary("watchdog"), /category=timeout/u);
});

test("only the first terminal failure presents and a throwing presenter is harmless", async () => {
  const seen: string[] = [];
  const report = createDeviceFailureReporter((content) => { seen.push(content); return Promise.reject(new Error("private")); });
  report("transport", { errMsg: "request:fail timeout" });
  report("http", undefined, 500);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(seen.length, 1);
  assert.match(seen[0]!, /category=timeout/u);
  const throws = createDeviceFailureReporter(() => { throw new Error("private"); });
  assert.doesNotThrow(() => throws("dispatch"));
  assert.doesNotThrow(() => throws("http", undefined, 403));
});

test("a reporter never reads error getters after the first report", () => {
  const report = createDeviceFailureReporter(() => undefined);
  report("watchdog");
  let reads = 0;
  report("transport", { get errMsg() { reads += 1; return "private"; } });
  assert.equal(reads, 0);
});
