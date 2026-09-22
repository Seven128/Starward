import assert from "node:assert/strict";
import test from "node:test";
import { createPlanSubscriptionClient } from "./plan-subscription-client";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";

test("subscription transport uses generated paths, explicit choices and account fences", async () => {
  let owner = "a", switchDuringRequest = false, recorded = true, confirmations = 0;
  const calls: { path: string; options: any }[] = [];
  const request = createAuthenticatedOperationRequester({
    resolveSession: async () => ({userId: owner}) as any,
    readStoredSession: () => ({userId: owner}) as any,
    clearStoredSession: () => {}, isPermissionDenied: () => false,
    request: (async (_key: string, path: string, options: any) => {
      calls.push({path, options});
      if (switchDuringRequest) owner = "b";
      return {data: options.method === "POST" ? {state:"UNAVAILABLE",reason:"NOT_CONFIGURED"} : {recorded}};
    }) as any,
  });
  const client = createPlanSubscriptionClient({request,currentUser:()=>owner,confirmed:async()=>{confirmations++;}});
  assert.equal((await client.prepare("a","plan:one","r")).data.state,"UNAVAILABLE");
  assert.equal(calls.length,1,"preparation does not automatically report authorization");
  assert.equal(calls[0]!.path,"/v2/me/observation-plans/plan%3Aone/reminder-subscription");
  assert.deepEqual(calls[0]!.options.body,{reminderId:"r"});
  await client.report("a","challenge-one","reject");
  assert.equal(calls[1]!.options.method,"PUT");
  assert.deepEqual(calls[1]!.options.body,{choice:"reject"});
  assert.equal(confirmations,1);
  recorded=false;
  await client.report("a","challenge-one","accept");
  assert.equal(confirmations,1,"unrecorded reports cannot claim a changed plan");
  switchDuringRequest=true;
  await assert.rejects(client.report("a","challenge-one","accept"),/账户已变化/);
  assert.equal(confirmations,1);
  const count=calls.length;
  await assert.rejects(client.prepare("a","plan:one","r"),/账户已变化/);
  assert.equal(calls.length,count,"stale owner cannot start a request");
  owner="a";
  await assert.rejects(client.prepare("a","plan:one","r"),/账户已变化/);
});
