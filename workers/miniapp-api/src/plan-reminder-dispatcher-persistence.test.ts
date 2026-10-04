import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes,randomUUID } from 'node:crypto';
import type { ObservationPlan, UserId } from '@starward/miniapp-contracts';
import { PostgresMiniappRepository } from './postgres-repository.ts';
import { PostgresReminderSubscriptionStore } from './postgres-reminder-subscription-store.ts';
import { PostgresReminderAttemptStore } from './postgres-reminder-attempt-store.ts';
import { PlanReminderDispatcher } from './plan-reminder-dispatcher.ts';
import { createTestRuntimeConfig } from './runtime-config.ts';
import { encryptWechatDeliveryIdentity } from './wechat-delivery-identity.ts';
import { insertExplicitTestSpot } from './test-fixtures/infrastructure-spot.ts';
import { OutboxWorkerRuntime } from './outbox-worker.ts';
import { Queue } from 'bullmq';

const databaseUrl=process.env.PLAN_REMINDER_TEST_DATABASE_URL;
test('production reminder dispatcher uses durable PostgreSQL authorization, current content and bounded recovery', {skip:!databaseUrl},async t=> {
  assert.ok(databaseUrl);assert.match(new URL(databaseUrl).pathname,/^\/starward_reminder_[a-f0-9]+$/u);
  const repository=await new PostgresMiniappRepository(databaseUrl).initialize({migrate:true});
  const subscriptions=new PostgresReminderSubscriptionStore(repository.pool);
  const key=randomBytes(32).toString('hex'),base=createTestRuntimeConfig();
  const config=createTestRuntimeConfig({storageMode:'POSTGRES',authMode:'WECHAT',mediaStorage:{mode:'DISABLED',root:null,maxUploadBytes:1200000},wechat:{...base.wechat,
    appId:'synthetic-app',appSecret:'synthetic-secret',deliveryIdentityKey:key,subscriptionTemplateId:'synthetic-template',
    reminderDelivery:{enabled:true,fields:{thing1:'REMINDER_TITLE',time2:'DEPARTURE_LOCAL_TIME'},maxLatenessMs:300000,miniprogramState:'developer'}}});
  const binding={appId:config.wechat.appId!,templateId:config.wechat.subscriptionTemplateId!};
  const spot=await insertExplicitTestSpot(repository);
  const departure=new Date(Math.floor((Date.now()+7200000)/60000)*60000);
  const date=departure.toISOString().slice(0,10),time=departure.toISOString().slice(11,16);
  const trigger=new Date(departure.getTime()-3600000);
  let now=new Date(trigger.getTime()+1000);
  const clock=()=>new Date(now);
  const accounts:UserId[]=[];
  const makePlan=async()=> {
    const identity='dispatcher:'+randomUUID();
    const userId=await repository.findOrCreateWechatUser(identity);accounts.push(userId);
    await repository.saveWechatDeliveryIdentity({userId,identityDigest:identity,appId:binding.appId,
      ciphertext:encryptWechatDeliveryIdentity('synthetic-recipient',userId,binding.appId,key)});
    const plan=await repository.savePlan(userId,{planId:'plan:'+randomUUID(),spotId:spot.spotId,localDate:date,localTime:time,notes:'',
      timing:{departureLocalDate:date,departureLocalTime:time,endLocalDate:date,endLocalTime:'23:59'},
      contextSnapshot:{schemaVersion:'observation-context-snapshot-v1',timezone:'UTC',spotId:spot.spotId,localDate:date},
      reminders:[{reminderId:'equipment',title:'设备',hoursBeforeDeparture:1,notifyOnWechat:true,items:[]}],
      revision:0,updatedAt:new Date().toISOString()} as unknown as ObservationPlan,null,randomUUID());
    const challenge=await subscriptions.prepare(userId,plan.planId,'equipment',binding);assert.ok(challenge);
    assert.equal(await subscriptions.record(userId,challenge.challengeId,'accept',binding),true);
    return {userId,plan,version:challenge.scheduleVersion,identity};
  };
  const flag=async(enabled:boolean)=>repository.pool.query(`INSERT INTO feature_flags(flag_key,payload)
    VALUES('NOTIFICATION_ENABLED',$1) ON CONFLICT(flag_key) DO UPDATE SET payload=EXCLUDED.payload`,[{value:enabled}]);
  const cleanup=async()=> {for(const id of accounts.splice(0)) await repository.deleteAccount(id,randomUUID());};
  const attemptCount=async()=> (await repository.pool.query('SELECT count(*)::int AS count FROM plan_reminder_delivery_attempts')).rows[0].count;
  const mutation=async(row:Awaited<ReturnType<typeof makePlan>>,change:Partial<ObservationPlan>)=>
    repository.savePlan(row.userId,{...row.plan,...change},row.plan.revision,randomUUID());
  try {
    await flag(true);
    await t.test('missing configuration or existing flag performs zero token/reservation/send',async()=> {
      for(const disabled of [{...config,wechat:{...config.wechat,subscriptionTemplateId:null}},
        {...config,wechat:{...config.wechat,reminderDelivery:{...config.wechat.reminderDelivery!,fields:null}}},config]) {
        await makePlan(); await flag(disabled!==config);
        const before=await attemptCount();let calls=0;
        const dispatcher=new PlanReminderDispatcher(repository.pool,disabled,async()=> {calls++;throw new Error('forbidden');},clock);
        const result=await dispatcher.run();assert.equal(result.resultState,'CAPABILITY_GATED');
        assert.equal(result.resultPayload.reserved,0);assert.equal(result.resultPayload.submitted,0);assert.equal(calls,0);
        assert.equal(await attemptCount(),before);await cleanup();
      }
      await flag(true);
    });
    await t.test('concurrent workers submit exactly once and restart preserves the accepted result',async()=> {
      const row=await makePlan();let sends=0;
      const transport:typeof fetch=async(url,init)=> {
        if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token',expires_in:7200});
        sends++;const body=JSON.parse(String(init?.body));
        assert.equal(body.touser,'synthetic-recipient');assert.equal(body.miniprogram_state,'developer');
        assert.equal(body.page,'content/plan/detail/index?planId='+encodeURIComponent(row.plan.planId));
        assert.deepEqual(body.data,{thing1:{value:'设备'},time2:{value:date+' '+time}});
        return Response.json({errcode:0});
      };
      await Promise.all(Array.from({length:8},()=>new PlanReminderDispatcher(repository.pool,config,transport,clock).run()));
      assert.equal(sends,1);assert.equal((await repository.listPlanReminderSchedules(row.userId))[0]!.state,'SENT');
      await new PlanReminderDispatcher(repository.pool,config,transport,clock).run();assert.equal(sends,1);
      await cleanup();
    });
    await t.test('title change during token wait reloads current content without consuming an invalid template value',async()=> {
      const row=await makePlan();let resolve!:(response:Response)=>void,sends=0;
      const dispatcher=new PlanReminderDispatcher(repository.pool,config,async(url)=> {
        if(String(url).endsWith('/stable_token')) return new Promise(r=>{resolve=r;});
        sends++;return Response.json({errcode:0});
      },clock);
      const pending=dispatcher.run();while(!resolve) await new Promise(r=>setImmediate(r));
      const edited=await mutation(row,{reminders:[{...row.plan.reminders![0]!,title:'长'.repeat(21)}]});
      assert.equal((await repository.listPlanReminderSchedules(row.userId))[0]!.scheduleVersion,row.version);
      resolve(Response.json({access_token:'synthetic-token',expires_in:7200}));
      const result=await pending;assert.equal(result.resultPayload.reserved,0);assert.equal(sends,0);
      assert.equal((await repository.listPlanReminderSchedules(row.userId))[0]!.attemptCount,0);
      await repository.savePlan(row.userId,{...edited,reminders:[{...edited.reminders![0]!,title:'设备'}]},edited.revision,randomUUID());
      await dispatcher.run();assert.equal(sends,1);await cleanup();
    });
    await t.test('deletion, reschedule, intent off, identity binding change and erasure during token wait never reserve or send',async()=> {
      for(const kind of ['delete','reschedule','off','identity','erase']) {
        const row=await makePlan();let resolve!:(response:Response)=>void,sends=0;
        const dispatcher=new PlanReminderDispatcher(repository.pool,config,async(url)=> {
          if(String(url).endsWith('/stable_token')) return new Promise(r=>{resolve=r;});
          sends++;return Response.json({errcode:0});
        },clock);
        const pending=dispatcher.run();while(!resolve) await new Promise(r=>setImmediate(r));
        if(kind==='delete') await repository.deletePlan(row.userId,row.plan.planId,randomUUID());
        if(kind==='erase') {await repository.deleteAccount(row.userId,randomUUID());accounts.splice(accounts.indexOf(row.userId),1);}
        if(kind==='off') await mutation(row,{reminders:[{...row.plan.reminders![0]!,notifyOnWechat:false}]});
        if(kind==='reschedule') await mutation(row,{reminders:[{...row.plan.reminders![0]!,hoursBeforeDeparture:2}]});
        if(kind==='identity') await repository.pool.query("UPDATE wechat_identities SET delivery_app_id='other-app' WHERE user_id=$1",[row.userId]);
        resolve(Response.json({access_token:'synthetic-token',expires_in:7200}));
        const result=await pending;assert.equal(result.resultPayload.reserved,0,kind);assert.equal(sends,0,kind);
        await cleanup();
      }
    });
    await t.test('a revision change between mapping and reservation cannot consume the old mapped content',async()=> {
      const row=await makePlan();let sends=0;
      const original=PostgresReminderAttemptStore.prototype.reserve;
      t.mock.method(PostgresReminderAttemptStore.prototype,'reserve',async function(this:PostgresReminderAttemptStore,...args:Parameters<typeof original>) {
        await mutation(row,{reminders:[{...row.plan.reminders![0]!,title:'新标题'}]});
        return original.apply(this,args);
      });
      const result=await new PlanReminderDispatcher(repository.pool,config,async(url)=> {
        if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token',expires_in:7200});
        sends++;return Response.json({errcode:0});
      },clock).run();
      t.mock.restoreAll();assert.equal(result.resultPayload.reserved,0);assert.equal(sends,0);await cleanup();
    });
    await t.test('last qualification rejects cancellation and live disabled flag after durable reservation',async()=> {
      for(const action of ['delete','flag']) {
        const row=await makePlan();let sends=0;
        const original=PostgresReminderAttemptStore.prototype.eligibleBeforeSend;
        t.mock.method(PostgresReminderAttemptStore.prototype,'eligibleBeforeSend',async function(this:PostgresReminderAttemptStore,...args:Parameters<typeof original>) {
          if(action==='delete') await repository.deletePlan(row.userId,row.plan.planId,randomUUID()); else await flag(false);
          return original.apply(this,args);
        });
        const result=await new PlanReminderDispatcher(repository.pool,config,async(url)=> {
          if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token',expires_in:7200});
          sends++;return Response.json({errcode:0});
        },clock).run();
        t.mock.restoreAll();assert.equal(result.resultPayload.reserved,1);assert.equal(sends,0);
        assert.equal((await repository.pool.query('SELECT outcome FROM plan_reminder_delivery_attempts WHERE user_id=$1',[row.userId])).rows[0].outcome,'KNOWN_FAILURE');
        await flag(true);await cleanup();
      }
    });
    await t.test('ambiguous transport and failed finish remain durable UNKNOWN and never resubmit on job retry/restart',async()=> {
      for(const failFinish of [false,true]) {
        const row=await makePlan();let sends=0;
        const transport:typeof fetch=async(url)=> {
          if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token',expires_in:7200});
          sends++;if(!failFinish) throw new Error('sensitive-detail');return Response.json({errcode:0});
        };
        const dispatcher=new PlanReminderDispatcher(repository.pool,config,transport,clock);
        if(failFinish) {
          t.mock.method(PostgresReminderAttemptStore.prototype,'finish',async()=> {throw new Error('injected_persistence_failure');});
          await assert.rejects(dispatcher.run(),/injected_persistence_failure/);t.mock.restoreAll();
        } else await dispatcher.run();
        assert.equal((await repository.listPlanReminderSchedules(row.userId))[0]!.state,'RESULT_UNKNOWN');
        await dispatcher.run();await new PlanReminderDispatcher(repository.pool,config,transport,clock).run();
        assert.equal(sends,1);await cleanup();
      }
    });
    await t.test('invalid first page does not starve later valid content and fixing a title restores eligibility',async()=> {
      const rows=await Promise.all(Array.from({length:21},()=>makePlan()));
      rows.sort((a,b)=>a.version.localeCompare(b.version));
      const changed=[];
      for(const row of rows.slice(0,20)) changed.push(await mutation(row,{reminders:[{...row.plan.reminders![0]!,title:'长'.repeat(21)}]}));
      let sends=0;
      const dispatcher=new PlanReminderDispatcher(repository.pool,config,async(url)=> {
        if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token',expires_in:7200});
        sends++;return Response.json({errcode:0});
      },clock);
      const first=await dispatcher.run();assert.equal(first.resultPayload.invalidContent,20);assert.equal(sends,0);
      await dispatcher.run();assert.equal(sends,1);
      const edited=changed[0]!;
      await repository.savePlan(rows[0]!.userId,{...edited,reminders:[{...edited.reminders![0]!,title:'设备'}]},edited.revision,randomUUID());
      await dispatcher.run();assert.equal(sends,2);await cleanup();
    });
    await t.test('provider rejection refreshes token for the next independent schedule without retrying its grant',async()=> {
      let tokens=0,sends=0;
      const dispatcher=new PlanReminderDispatcher(repository.pool,config,async(url)=> {
        if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token-'+(++tokens),expires_in:7200});
        sends++;return Response.json({errcode:sends===1?40001:0});
      },clock);
      const first=await makePlan();await dispatcher.run();assert.equal(tokens,1);assert.equal(sends,1);
      const second=await makePlan();await dispatcher.run();assert.equal(tokens,2);assert.equal(sends,2);
      assert.equal((await repository.listPlanReminderSchedules(first.userId))[0]!.state,'FAILED');
      assert.equal((await repository.listPlanReminderSchedules(second.userId))[0]!.state,'SENT');
      await dispatcher.run();assert.equal(sends,2);await cleanup();
      tokens=0;sends=0;
      const quotaRejected=new PlanReminderDispatcher(repository.pool,config,async(url)=> {
        if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token-'+(++tokens),expires_in:7200});
        sends++;return Response.json({errcode:43101});
      },clock);
      await makePlan();await quotaRejected.run();await makePlan();await quotaRejected.run();
      assert.equal(sends,2);assert.equal(tokens,1,'quota rejection does not imply a token expired');await cleanup();
    });
    await t.test('a token failure leaves the unprocessed page eligible on the next check',async()=> {
      await Promise.all(Array.from({length:25},()=>makePlan()));let tokens=0,sends=0;
      const dispatcher=new PlanReminderDispatcher(repository.pool,config,async(url)=> {
        if(String(url).endsWith('/stable_token')) {
          tokens++;if(tokens===1) throw new Error('transient');return Response.json({access_token:'synthetic-token',expires_in:7200});
        }
        sends++;return Response.json({errcode:0});
      },clock);
      assert.equal((await dispatcher.run()).resultPayload.tokenUnavailable,1);assert.equal(sends,0);
      assert.equal((await dispatcher.run()).resultPayload.submitted,20);assert.equal(sends,20);
      assert.equal((await dispatcher.run()).resultPayload.submitted,5);assert.equal(sends,25);await cleanup();
    });
    await t.test('window expiry and departure are hard boundaries even on recovery/new worker',async()=> {
      for(const at of [new Date(trigger.getTime()+300001),departure]) {
        const row=await makePlan();now=at;let calls=0;
        const result=await new PlanReminderDispatcher(repository.pool,config,async()=> {calls++;throw new Error('forbidden');},clock).run();
        assert.equal(result.resultPayload.reserved,0);assert.equal(calls,0);
        const schedule=(await repository.listPlanReminderSchedules(row.userId))[0]!;
        assert.equal(schedule.state,'SKIPPED');assert.equal(schedule.reason,at===departure?'DEPARTURE_EXPIRED':'TRIGGER_MISSED');
        await cleanup();now=new Date(trigger.getTime()+1000);
      }
    });
    await t.test('actual NOTIFICATION releases outbox lock for HTTP and does not resend after effect failure/replay',
      {skip:!process.env.PLAN_REMINDER_TEST_REDIS_URL},async()=> {
      const row=await makePlan();let sends=0;
      const transport:typeof fetch=async(url)=> {
        if(String(url).endsWith('/stable_token')) return Response.json({access_token:'synthetic-token',expires_in:7200});
        sends++;
        const client=await repository.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SELECT event_id FROM outbox_events WHERE event_id=$1 FOR UPDATE NOWAIT',[eventId]);
          await client.query('ROLLBACK');
        } finally {client.release();}
        return Response.json({errcode:0});
      };
      // Other test-only plan intents have been independently exercised above;
      // isolate one actual outbox job in this dedicated synthetic database.
      await repository.pool.query("UPDATE outbox_events SET state='COMPLETE',completed_at=now() WHERE state='PENDING'");
      const eventId=randomUUID();
      await repository.pool.query(`INSERT INTO outbox_events(event_id,event_type,idempotency_key,payload)
        VALUES($1,'OperationalNOTIFICATIONRequested',$2,'{"jobKind":"NOTIFICATION"}')`,[eventId,randomUUID()]);
      await repository.pool.query(`CREATE FUNCTION test_reminder_effect_failure() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.job_kind='NOTIFICATION' THEN RAISE EXCEPTION 'injected_effect_failure'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER test_reminder_effect_failure BEFORE INSERT ON job_effects FOR EACH ROW EXECUTE FUNCTION test_reminder_effect_failure()`);
      const dispatcher=new PlanReminderDispatcher(repository.pool,config,transport,clock);
      const runtime=new OutboxWorkerRuntime({databaseUrl,redisUrl:process.env.PLAN_REMINDER_TEST_REDIS_URL!,
        queueName:'starward-reminder-'+randomUUID(),runtimeConfig:config,reminderDispatcher:dispatcher});
      try {
        await runtime.dispatchBatch();await runtime.waitForIdle();
        assert.equal((await repository.pool.query('SELECT state FROM outbox_events WHERE event_id=$1',[eventId])).rows[0].state,'DEAD_LETTER');
        assert.equal(sends,1);
        assert.equal((await repository.listPlanReminderSchedules(row.userId))[0]!.state,'SENT');
        await repository.pool.query('DROP TRIGGER test_reminder_effect_failure ON job_effects; DROP FUNCTION test_reminder_effect_failure()');
        await runtime.replayDeadLetter(eventId);await runtime.dispatchBatch();await runtime.waitForIdle();
        assert.equal((await repository.pool.query('SELECT state FROM outbox_events WHERE event_id=$1',[eventId])).rows[0].state,'COMPLETE');
        assert.equal(sends,1,'job receipt replay cannot repeat the already consumed schedule');
        await makePlan();
        await runtime.worker.pause();
        const enqueued=await Promise.all(Array.from({length:8},(_,index)=>runtime.enqueueReminderSweep(new Date(now.getTime()+index*5000))));
        assert.equal(enqueued.reduce((sum,value)=>sum+value,0),1,'cross-bucket concurrent enqueuers share one pending due check');
        assert.equal(await runtime.enqueueReminderSweep(new Date(now.getTime()+10000)),0,'one pending due check bounds backlog');
        await runtime.dispatchBatch();await runtime.waitForIdle();assert.equal(sends,2,'reminders progress while the other operational consumer is paused');
        await runtime.worker.resume();
        assert.equal(await runtime.enqueueReminderSweep(new Date(now.getTime()+10000)),0,'idle reminders do not create sweeps');
        await makePlan();
        const orphan=randomUUID();
        await repository.pool.query(`INSERT INTO outbox_events(event_id,event_type,idempotency_key,payload,state,dispatched_at)
          VALUES($1,'OperationalNOTIFICATIONRequested',$2,'{"jobKind":"NOTIFICATION"}','DISPATCHED',now())`,[orphan,randomUUID()]);
        t.mock.method(Queue.prototype,'getJob',async()=>{throw new Error('injected_redis_read_failure');});
        await assert.rejects(runtime.enqueueReminderSweep(new Date(now.getTime()+20000)),/injected_redis_read_failure/);
        t.mock.restoreAll();
        assert.equal((await repository.pool.query('SELECT state FROM outbox_events WHERE event_id=$1',[orphan])).rows[0].state,'DISPATCHED');
        await runtime.enqueueReminderSweep(new Date(now.getTime()+20000));
        assert.equal((await repository.pool.query('SELECT state FROM outbox_events WHERE event_id=$1',[orphan])).rows[0].state,'PENDING','verified absent handles recover the exact event rather than blocking all future sweeps');
        await runtime.dispatchBatch();await runtime.waitForIdle();assert.equal(sends,3);
      } finally {await runtime.close();await cleanup();}
    });
  } finally {t.mock.restoreAll();await cleanup();await repository.close();}
});
