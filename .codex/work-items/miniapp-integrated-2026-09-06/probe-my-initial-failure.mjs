import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function read(){return p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text,count:globalThis.__myInitialFailure?.count??0};});}
let result={};
try{
 await p.evaluate(()=>{const original=wx.request;const state={count:0,restore(){wx.request=original;clearTimeout(state.timer);}};globalThis.__myInitialFailure=state;wx.request=function(options){if(String(options.url).startsWith('http://127.0.0.1:8879/')&&String(options.url).includes('/me/contributions')&&(!options.method||options.method==='GET')){state.count++;const timer=setTimeout(()=>{const response={statusCode:403,data:{error:{code:'PERMISSION_DENIED',message:'当前无法读取反馈状态'}},header:{}};options.success?.(response);options.complete?.(response);},0);return{abort(){clearTimeout(timer);}};}return original.call(wx,options);};state.timer=setTimeout(state.restore,20000);wx.switchTab({url:'/pages/my/index'});});
 await pause(4000);result.failed=await read();assert.equal(result.failed.route,'pages/my/index');assert.ok(result.failed.count>0);assert.ok(result.failed.text.some(t=>t.includes('暂时无法确认待处理数量')));assert.ok(!result.failed.text.some(t=>t.includes('以下数量来自上次记录')));
 await p.evaluate(()=>{globalThis.__myInitialFailure.restore();const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel==='重试审核状态')sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('retry_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});});
 await pause(2500);result.recovered=await read();assert.ok(!result.recovered.text.some(t=>t.includes('暂时无法确认待处理数量')));
}finally{await p.evaluate(()=>{globalThis.__myInitialFailure?.restore();delete globalThis.__myInitialFailure;});await writeFile('artifacts/miniapp/my-initial-failure-runtime.json',JSON.stringify(result,null,2));await p.disconnect();}
console.log(JSON.stringify({count:result.failed.count,failure:result.failed.text.filter(t=>t.includes('状态')||t.includes('数量')),recovered:result.recovered.text.filter(t=>t.includes('状态')||t.includes('条'))}));
