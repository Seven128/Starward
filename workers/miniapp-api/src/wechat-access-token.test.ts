import assert from "node:assert/strict";
import test from "node:test";
import { WechatAccessTokenProvider } from "./wechat-access-token.ts";

test('stable token uses fixed HTTPS body, refuses redirects and caches only validated unexpired responses', async () => {
  let now=1000,calls=0;
  const provider = new WechatAccessTokenProvider('synthetic-app','synthetic-secret',async (url,init) => {
    calls++;
    assert.equal(String(url),'https://api.weixin.qq.com/cgi-bin/stable_token');
    assert.equal(init?.redirect,'error');
    assert.deepEqual(JSON.parse(String(init?.body)),{grant_type:'client_credential',appid:'synthetic-app',secret:'synthetic-secret',force_refresh:false});
    return Response.json({access_token:'synthetic-token',expires_in:7200});
  },()=>now);
  const signal = new AbortController().signal;
  assert.equal(await provider.get(signal),'synthetic-token');
  now+=7000000;
  assert.equal(await provider.get(signal),'synthetic-token'); assert.equal(calls,1);
  now+=140000;
  await provider.get(signal); assert.equal(calls,2);
});

test('token failures and aborted late responses never populate cache or leak credentials', async () => {
  for (const result of [{errcode:40013,errmsg:'secret-detail'}, {access_token:'synthetic-token',expires_in:0},
    {access_token:'synthetic-token',expires_in:7201},{access_token:'bad token',expires_in:7200}]) {
    const provider = new WechatAccessTokenProvider('app','secret',async()=>Response.json(result));
    await assert.rejects(provider.get(new AbortController().signal),/^Error: wechat_token_unavailable$/);
  }
  let resolve!: (value:Response)=>void,calls=0;
  const provider = new WechatAccessTokenProvider('app','secret',async()=> {calls++;return new Promise(r=>{resolve=r;});});
  const controller=new AbortController();
  const pending=provider.get(controller.signal); controller.abort();
  resolve(Response.json({access_token:'synthetic-late-token',expires_in:7200}));
  await assert.rejects(pending,/wechat_token_unavailable/);
  await assert.rejects(provider.get(controller.signal),/wechat_token_unavailable/);
  assert.equal(calls,1);
});

test('invalidation refreshes the next acquisition while an old rejection cannot evict a newer token',async()=> {
  let calls=0;
  const provider=new WechatAccessTokenProvider('app','secret',async()=>Response.json({access_token:'synthetic-token-'+(++calls),expires_in:7200}));
  const signal=new AbortController().signal;
  const old=await provider.get(signal);provider.invalidate(old);
  const fresh=await provider.get(signal);assert.notEqual(old,fresh);
  provider.invalidate(old);assert.equal(await provider.get(signal),fresh);assert.equal(calls,2);
});
