import assert from "node:assert/strict";
import test from "node:test";
import { configuredReminderDelivery, parseReminderFields } from "./plan-reminder-delivery-config.ts";
import { mapReminderDeliveryFields } from "./plan-reminder-delivery-payload.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { derivePlanReminderSchedules, publicReminderStatus } from "./plan-reminder-schedule.ts";
import type { ObservationPlan } from "@starward/miniapp-contracts";

const fields = parseReminderFields('{"thing1":"REMINDER_TITLE","time2":"DEPARTURE_LOCAL_TIME"}');
const plan = {planId:'plan:one',revision:4,contextSnapshot:{timezone:'Asia/Shanghai'},
  timing:{departureLocalDate:'2026-11-01',departureLocalTime:'20:00'},
  reminders:[{reminderId:'equipment',title:'设备',hoursBeforeDeparture:1,notifyOnWechat:true,items:[]}] } as unknown as ObservationPlan;

test('mapping preserves user title and saved departure wall time; invalid content is never silently truncated', () => {
  assert.deepEqual(mapReminderDeliveryFields(plan,'equipment','观星点',fields),
    {thing1:{value:'设备'},time2:{value:'2026-11-01 20:00'}});
  for (const title of ['', '长'.repeat(21),'设备\n提醒','设备\t提醒','设备\u007f提醒']) {
    assert.equal(mapReminderDeliveryFields({...plan,reminders:[{...plan.reminders![0]!,title}]},'equipment','地点',fields),null);
  }
  assert.ok(mapReminderDeliveryFields({...plan,reminders:[{...plan.reminders![0]!,title:'🌟'.repeat(20)}]},'equipment','地点',fields));
  for (const raw of ['{}','{"phrase1":"REMINDER_TITLE","time2":"DEPARTURE_LOCAL_TIME"}',
    '{"thing1":"SPOT_NAME","time2":"DEPARTURE_LOCAL_TIME"}',
    '{"thing1":"REMINDER_TITLE","time2":"UNKNOWN"}','null','[]','{"thing0":"REMINDER_TITLE","time2":"DEPARTURE_LOCAL_TIME"}'])
    assert.throws(() => parseReminderFields(raw),/wechat_reminder_fields_invalid/);
});

test('delivery readiness requires every configured responsibility; one template or enable flag is insufficient', () => {
  const base = createTestRuntimeConfig();
  const wechat = {...base.wechat,appId:'synthetic-app',appSecret:'synthetic-secret',deliveryIdentityKey:'19'.repeat(32),
    subscriptionTemplateId:'synthetic-template',reminderDelivery:{enabled:true,fields,maxLatenessMs:300000,miniprogramState:'developer' as const}};
  const config = createTestRuntimeConfig({storageMode:'POSTGRES',authMode:'WECHAT',wechat});
  assert.ok(configuredReminderDelivery(config));
  for (const missing of [{appId:null},{appSecret:null},{deliveryIdentityKey:null},{subscriptionTemplateId:null},
    {reminderDelivery:{...wechat.reminderDelivery,enabled:false}},
    {reminderDelivery:{...wechat.reminderDelivery,fields:null}},
    {reminderDelivery:{...wechat.reminderDelivery,miniprogramState:null}},
    {reminderDelivery:{...wechat.reminderDelivery,maxLatenessMs:null}},
    {reminderDelivery:{...wechat.reminderDelivery,maxLatenessMs:59999}}])
    assert.equal(configuredReminderDelivery({...config,wechat:{...wechat,...missing}}),null);
  assert.equal(configuredReminderDelivery({...config,authMode:'LOCAL_TEST'}),null);
  assert.equal(configuredReminderDelivery({...config,storageMode:'MEMORY_TEST'}),null);
});

test('public scheduled state stays honest during dispatch window and skips afterward or at departure', () => {
  const row = {...derivePlanReminderSchedules('synthetic-user',plan,new Date('2026-10-31T00:00Z'))[0]!,
    state:'SCHEDULED' as const,reason:'WAITING_FOR_TRIGGER'};
  assert.equal(row.triggerAtUtc,'2026-11-01T11:00:00.000Z');
  for (const now of ['2026-11-01T11:00:00Z','2026-11-01T11:05:00Z'])
    assert.equal(publicReminderStatus(row,true,new Date(now),300000).state,'SCHEDULED');
  assert.equal(publicReminderStatus(row,true,new Date('2026-11-01T11:05:00.001Z'),300000).reason,'TRIGGER_MISSED');
  assert.equal(publicReminderStatus(row,true,new Date('2026-11-01T12:00:00Z'),3600000).reason,'DEPARTURE_EXPIRED');
  assert.equal(publicReminderStatus(row,false,new Date('2026-11-01T11:00:00Z'),300000).reason,'TRIGGER_MISSED');
  assert.equal(publicReminderStatus({...row,state:'WAITING_AUTHORIZATION'},true,new Date('2026-11-01T11:00:00Z'),300000).reason,'TRIGGER_MISSED');
});
