import test from 'node:test';
import assert from 'node:assert/strict';
import {selectUpcomingPlans,WINDOW_MS} from './plan-selection.mjs';
const now=Date.parse('2026-09-08T18:30:00+08:00');
const plan=(id,offset)=>({planId:id,selectedAt:new Date(now+offset).toISOString()});
test('filters past, invalid and beyond 24h; includes both boundaries',()=>{
 const result=selectUpcomingPlans([plan('past',-1),plan('now',0),plan('boundary',WINDOW_MS),plan('later',WINDOW_MS+1),{planId:'bad',selectedAt:'bad'}],now);
 assert.deepEqual(result.visible.map(p=>p.planId),['now','boundary']); assert.equal(result.hasMore,false);
});
test('orders across midnight by instant, limits three, more only on fourth',()=>{
 const rows=[plan('d',20e6),plan('b',4e6),plan('c',19.8e6),plan('a',1e6)];
 assert.deepEqual(selectUpcomingPlans(rows,now).visible.map(p=>p.planId),['a','b','c']);
 assert.equal(selectUpcomingPlans(rows,now).hasMore,true);
 assert.equal(selectUpcomingPlans(rows.slice(1),now).hasMore,false);
 assert.deepEqual(rows.map(p=>p.planId),['d','b','c','a']);
});
test('same instant in different zones sorts stably; advancing clock expires rows',()=>{
 const rows=[{planId:'b',selectedAt:'2026-09-08T20:30:00+08:00'},{planId:'a',selectedAt:'2026-09-08T12:30:00Z'}];
 assert.deepEqual(selectUpcomingPlans(rows,now).visible.map(p=>p.planId),['a','b']);
 assert.equal(selectUpcomingPlans(rows,now+3*3600000).total,0);
 assert.equal(selectUpcomingPlans([],now).hasMore,false);
});
