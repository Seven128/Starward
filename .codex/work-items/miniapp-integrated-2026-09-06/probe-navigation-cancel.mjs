import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
const read=()=>p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text};});
const tap=()=>p.evaluate(()=>{const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith('去这里，打开'))sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('navigation_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});});
try{
 const before=await read();assert.equal(before.route,'spot/field/index');assert.ok(!before.text.includes('导航选项暂未打开'));
 await p.evaluate(()=>{const original=wx.showActionSheet;const state={count:0,mode:'cancel',restore(){wx.showActionSheet=original;clearTimeout(state.timer);}};globalThis.__navigationCancelProbe=state;wx.showActionSheet=function(options){state.count++;setTimeout(()=>{const error={errMsg:'showActionSheet:fail '+state.mode};options.fail?.(error);options.complete?.(error);},0);};state.timer=setTimeout(state.restore,15000);});
 await tap();await pause(700);const cancelled=await read();assert.ok(!cancelled.text.includes('导航选项暂未打开'));assert.equal(await p.evaluate(()=>globalThis.__navigationCancelProbe.count),1);
 await p.evaluate(()=>{globalThis.__navigationCancelProbe.mode='unavailable';});await tap();await pause(700);const failed=await read();assert.ok(failed.text.includes('导航选项暂未打开'));assert.equal(failed.route,'spot/field/index');
 result={cancelQuiet:true,failureVisible:true,route:failed.route,calls:await p.evaluate(()=>globalThis.__navigationCancelProbe.count)};
}finally{await p.evaluate(()=>{globalThis.__navigationCancelProbe?.restore();delete globalThis.__navigationCancelProbe;});await p.disconnect();await writeFile('artifacts/miniapp/navigation-cancel-runtime.json',JSON.stringify(result??{incomplete:true},null,2));}
console.log(JSON.stringify(result));
