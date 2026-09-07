import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function read(){return p.evaluate(()=>{const page=getCurrentPages().at(-1),selected=[],text=[];function scan(n){if(!n||typeof n!=='object')return;if(n.cl?.includes('tick--selected'))selected.push(n.ariaLabel);if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return {route:page.route,selected,preview:text.includes('预览')};});}
async function event(type,count=1){await p.evaluate(({type,count})=>{const page=getCurrentPages().at(-1);let sid,index;function scan(n){if(!n||typeof n!=='object')return;if(n.cl==='sky-orientation-time-ruler__viewport')sid=n.sid;if(n.ariaLabel?.startsWith('下午09:20，第'))index=Number(n.ariaLabel.match(/第 (\d+)/)[1])-1;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid||index===undefined)throw Error('sky_ruler_missing');const target={id:sid,dataset:{sid}};page.eh({type,timeStamp:Date.now(),target,currentTarget:target,touches:Array.from({length:count},(_,i)=>({identifier:i,clientX:100+i*20,clientY:200,pageX:100+i*20,pageY:200})),changedTouches:[],detail:{scrollLeft:index*wx.getSystemInfoSync().windowWidth*34/750}});},{type,count});await pause(180);}
const result={lane:'compiled-WEAPP-component-events-not-physical-touch'};
try {
 for(let i=0;i<8;i++){result.before=await read();if(result.before.selected.length)break;await pause(500);}
 assert.match(result.before.selected[0]??'',/09:00/);
 await event('scroll');await event('scrollend');result.programmatic=await read();assert.deepEqual(result.programmatic,result.before);
 await event('touchstart');await event('scroll');result.preview=await read();assert.equal(result.preview.preview,true);assert.match(result.preview.selected[0]??'',/09:20/);
 await event('touchmove',2);await event('scrollend');result.cancelled=await read();assert.deepEqual(result.cancelled,result.before);
 await event('touchstart');await event('scroll');await event('touchcancel',0);await event('scrollend');result.touchCancelled=await read();assert.deepEqual(result.touchCancelled,result.before);
}finally{
 await event('touchcancel',0).catch(()=>{});
 result.restored=await read();await writeFile('artifacts/miniapp/sky-ruler-cancel-runtime.json',JSON.stringify(result,null,2));await p.disconnect();
}
console.log(JSON.stringify(result));
