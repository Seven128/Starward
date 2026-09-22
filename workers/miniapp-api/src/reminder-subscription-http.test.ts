import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { ObservationPlan } from "@starward/miniapp-contracts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { createWeatherPort } from "./weather-provider.ts";
import { DisabledRouteAdapter } from "./route-provider.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";
import { encryptWechatDeliveryIdentity } from "./wechat-delivery-identity.ts";

const databaseUrl = process.env.PLAN_REMINDER_TEST_DATABASE_URL;
test("reminder subscription HTTP uses session identity and persists one reported choice without enabling delivery", { skip: !databaseUrl }, async () => {
  assert.ok(databaseUrl); assert.match(new URL(databaseUrl).pathname, /^\/starward_reminder_[a-f0-9]+$/u);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const base = createTestRuntimeConfig();
  const config = createTestRuntimeConfig({ authMode:"WECHAT", wechat:{ ...base.wechat, appId:"synthetic-app", appSecret:"synthetic",
    deliveryIdentityKey:randomBytes(32).toString("hex"), subscriptionTemplateId:"synthetic-template" } });
  const service = new MiniappService({ repository, config, weather:createWeatherPort(config), route:new DisabledRouteAdapter() });
  class TestModule {}
  Module({ controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}] })(TestModule);
  const app = await NestFactory.create(TestModule,new FastifyAdapter(),{logger:false});
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    const spot = await insertExplicitTestSpot(repository);
    const userId = await repository.findOrCreateWechatUser(`http:${randomUUID()}`);
    const otherId = await repository.findOrCreateWechatUser(`http-other:${randomUUID()}`);
    const identity = (await repository.pool.query("SELECT identity_digest FROM wechat_identities WHERE user_id=$1",[userId])).rows[0].identity_digest;
    await repository.saveWechatDeliveryIdentity({userId,identityDigest:identity,appId:config.wechat.appId!,
      ciphertext:encryptWechatDeliveryIdentity("synthetic-recipient",userId,config.wechat.appId!,config.wechat.deliveryIdentityKey!)});
    const token = randomBytes(32).toString("base64url"), otherToken = randomBytes(32).toString("base64url");
    for (const [id,value] of [[userId,token],[otherId,otherToken]] as const)
      await repository.createSession({userId:id,tokenDigest:createHmac("sha256",config.wechat.sessionSecret).update(`session:${value}`).digest("hex"),expiresAt:new Date(Date.now()+3600_000).toISOString()});
    const departure = new Date(Date.now()+86400_000);
    const date = departure.toISOString().slice(0,10), time=departure.toISOString().slice(11,16);
    const plan = await repository.savePlan(userId,{planId:`plan:${randomUUID()}`,spotId:spot.spotId,localDate:date,localTime:time,notes:"",
      timing:{departureLocalDate:date,departureLocalTime:time,endLocalDate:date,endLocalTime:"23:59"},
      contextSnapshot:{timezone:"UTC",spotId:spot.spotId,localDate:date},revision:0,updatedAt:new Date().toISOString(),
      reminders:[{reminderId:"equipment",title:"设备",hoursBeforeDeparture:1,notifyOnWechat:true,items:[]}] } as unknown as ObservationPlan,null,randomUUID());
    await app.listen(0,"127.0.0.1");
    const url = await app.getUrl();
    const preparePath=`/v2/me/observation-plans/${encodeURIComponent(plan.planId)}/reminder-subscription`;
    const invoke = (path:string, method:string, body:unknown, bearer?:string) => fetch(url+path,{method,headers:{"content-type":"application/json",...(bearer?{authorization:`Bearer ${bearer}`}:{})},body:JSON.stringify(body)});
    assert.equal((await invoke(preparePath,"POST",{reminderId:"equipment"})).status,403);
    assert.equal((await invoke(preparePath,"POST",null,token)).status,400);
    const foreign = await (await invoke(preparePath,"POST",{reminderId:"equipment"},otherToken)).json();
    assert.deepEqual(foreign.data,{state:"UNAVAILABLE",reason:"REMINDER_NOT_ELIGIBLE"});
    const prepared = await (await invoke(preparePath,"POST",{reminderId:"equipment",userId:otherId},token)).json();
    assert.equal(prepared.data.state,"READY");
    assert.equal(prepared.data.templateId,"synthetic-template");
    assert.ok(!JSON.stringify(prepared).includes("synthetic-recipient"));
    const reportPath=`/v2/me/reminder-subscriptions/${prepared.data.challengeId}`;
    assert.equal((await invoke(reportPath,"PUT",{choice:"accept"})).status,403);
    assert.equal((await invoke(reportPath,"PUT",{choice:"allow"},token)).status,400);
    for (const malformed of ["-".repeat(36), "a".repeat(36)])
      assert.equal((await invoke(`/v2/me/reminder-subscriptions/${malformed}`,"PUT",{choice:"accept"},token)).status,400);
    assert.equal((await (await invoke(reportPath,"PUT",{choice:"accept"},otherToken)).json()).data.recorded,false);
    await service.getPlans(userId); // Populate the actual plan cache before mutation.
    const cacheKey = "plans:" + createHash("sha256").update(JSON.stringify(userId)).digest("hex").slice(0,24);
    assert.ok(await service.cache.get(cacheKey));
    const accepted = await (await invoke(reportPath,"PUT",{choice:"accept",userId:otherId},token)).json();
    assert.equal(accepted.data.recorded,true);
    assert.equal(await service.cache.get(cacheKey),null,"recording authorization invalidates the existing plan response");
    assert.equal((await (await invoke(reportPath,"PUT",{choice:"accept"},token)).json()).data.recorded,true);
    const stored = await repository.pool.query("SELECT state FROM plan_reminder_subscription_challenges WHERE challenge_id=$1 AND user_id=$2",[prepared.data.challengeId,userId]);
    assert.deepEqual(stored.rows,[{state:"CLIENT_ACCEPTED"}]);
    assert.equal((await repository.listPlanReminderSchedules(userId))[0]!.state,"SCHEDULED");
    assert.equal((await service.getPlans(userId)).data.reminderNotifications![0]!.state,"CAPABILITY_UNAVAILABLE","authorization storage alone does not connect a sender");
    const noTemplate = new MiniappService({repository,config:createTestRuntimeConfig({ ...config,wechat:{...config.wechat,subscriptionTemplateId:null} }),weather:createWeatherPort(config),route:new DisabledRouteAdapter()});
    assert.deepEqual((await noTemplate.prepareReminderSubscription(userId,plan.planId,{reminderId:"equipment"})).data,{state:"UNAVAILABLE",reason:"NOT_CONFIGURED"});
    assert.equal((await noTemplate.reportReminderSubscription(userId,prepared.data.challengeId,{choice:"accept"})).data.recorded,false);
    await assert.rejects(noTemplate.reportReminderSubscription(userId,"-".repeat(36),{choice:"accept"}),/reminder_subscription_challenge_invalid/);
    await repository.deleteAccount(userId,randomUUID());
    assert.equal((await invoke(reportPath,"PUT",{choice:"accept"},token)).status,403);
  } finally { await app.close(); }
});
