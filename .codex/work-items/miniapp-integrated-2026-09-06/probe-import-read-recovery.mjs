import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const read=()=>p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text,count:globalThis.__importReadProbe?.count??0};});
let result={};
try{
 await p.evaluate(()=>wx.switchTab({url:'/pages/my/index'}));await pause(1200);
 await p.evaluate(()=>{const original=wx.request;const state={count:0,restore(){wx.request=original;clearTimeout(state.timer);}};globalThis.__importReadProbe=state;wx.request=function(options){if(String(options.url).startsWith('http://127.0.0.1:8879/')&&String(options.url).includes('/me/imports')&&(!options.method||options.method==='GET')){state.count++;const timer=setTimeout(()=>{const response={statusCode:403,data:{error:{code:'PERMISSION_DENIED',message:'当前无法读取主页链接'}},header:{}};options.success?.(response);options.complete?.(response);},0);return{abort(){clearTimeout(timer);}};}return original.call(wx,options);};state.timer=setTimeout(state.restore,20000);wx.navigateTo({url:'/content/import/index'});});
 await pause(3500);const failed=await read();assert.ok(failed.count>0);assert.equal(failed.route,'content/import/index');
 const stale=failed.text.some(t=>t.includes('导入列表更新失败'));
 assert.ok(stale||failed.text.some(t=>t.includes('导入列表暂时无法加载')));
 if(!stale){assert.ok(failed.text.includes('—'));assert.ok(!failed.text.includes('还没有导入草稿。'));}
 await p.evaluate(label=>{globalThis.__importReadProbe.restore();const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel===label)sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('retry_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});},stale?'重新获取列表':'重试');
 await pause(2000);const recovered=await read();assert.ok(!recovered.text.some(t=>t.includes('导入列表更新失败')||t.includes('导入列表暂时无法加载')));assert.ok(recovered.text.includes('已有导入草稿'));
 result={requests:failed.count,scenario:stale?'cached-list-refresh-failure':'initial-failure',failureVisible:true,recovered:true};
}finally{await p.evaluate(()=>{globalThis.__importReadProbe?.restore();delete globalThis.__importReadProbe;});await p.disconnect();await writeFile('artifacts/miniapp/import-read-recovery-runtime.json',JSON.stringify(result,null,2));}
console.log(JSON.stringify(result));
