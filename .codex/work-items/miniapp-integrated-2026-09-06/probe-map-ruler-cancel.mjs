import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function read(){return p.evaluate(()=>{const page=getCurrentPages().at(-1),labels=[];function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.match(/^09\/0[67] /))labels.push(n.ariaLabel);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return {route:page.route,selected:labels.filter(x=>x.includes('已选择'))};});}
async function event(type,count=1,left=19*44){await p.evaluate(({type,count,left})=>{const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.cl==='map-time-ruler__scroll')sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('ruler_missing');const target={id:sid,dataset:{sid}};page.eh({type,timeStamp:Date.now(),target,currentTarget:target,touches:Array.from({length:count},(_,i)=>({identifier:i,clientX:100+i*20,clientY:200,pageX:100+i*20,pageY:200})),changedTouches:[],detail:{scrollLeft:left,scrollTop:0}});},{type,count,left});await pause(150);}
let result={lane:'compiled-WEAPP-component-events-not-physical-multitouch'};
try{
 result.before=await read();assert.deepEqual(result.before.selected,['09/06 21:00，已选择']);
 await event('touchstart');await event('scroll');result.preview=await read();
 await event('touchmove',2);await event('scrollend');result.cancelled=await read();
 assert.deepEqual(result.preview.selected,['09/06 21:30，已选择']);
 assert.deepEqual(result.cancelled.selected,result.before.selected);
 await event('touchstart');await event('scroll');await event('scrollend');await pause(2200);result.recovered=await read();
 assert.deepEqual(result.recovered.selected,['09/06 21:30，已选择']);
}finally{
 await event('touchcancel',0);
 await p.evaluate(()=>{const page=getCurrentPages().at(-1);let sid,parent;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith('09/06 21:00'))sid=n.sid;if(n.cl?.startsWith('map-panel-layer'))parent=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('restore_tick_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',target,currentTarget:target,detail:{}});if(parent)page.eh({type:'tap',target,currentTarget:{id:parent,dataset:{sid:parent}},detail:{}});});
 await pause(1800);result.restored=await read();await writeFile('artifacts/miniapp/map-ruler-cancel-runtime.json',JSON.stringify(result,null,2));await p.disconnect();
}
assert.deepEqual(result.restored.selected,result.before.selected);console.log(JSON.stringify(result));
