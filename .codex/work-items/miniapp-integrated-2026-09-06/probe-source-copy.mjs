import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
try {
 await p.evaluate(()=>{
  if(getCurrentPages().at(-1).route!=='spot/data-source/index')throw Error('requires_source_page');
  const original=wx.setClipboardData;
  const state={calls:0,restore(){wx.setClipboardData=original;clearTimeout(state.timer);}};
  globalThis.__sourceCopyProbe=state;
  wx.setClipboardData=function(options){state.calls++;setTimeout(()=>options.fail?.({errMsg:'setClipboardData:fail isolated unavailable'}),0);};
  state.timer=setTimeout(state.restore,20000);
 });
 const tap=()=>p.evaluate(()=>{
  const page=getCurrentPages().at(-1);let sid;
  function scan(n){if(!n||typeof n!=='object')return;if(!sid&&n.ariaLabel?.startsWith('复制')&&n.ariaLabel?.endsWith('的原始出处链接'))sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}
  scan(page.data);if(!sid)throw Error('copy_control_missing');
  const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});
 });
 const read=()=>p.evaluate(()=>{
  const text=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(getCurrentPages().at(-1).data);
  return{failure:text.includes('未能复制链接，请重试。'),success:text.includes('链接已复制，可在浏览器中查看。'),duplicateMissingRange:text.some(v=>v.includes('起始时间未提供')||v.includes('结束时间未提供'))};
 });
 await tap();await pause(500);const failure=await read();assert.equal(failure.failure,true);
 await p.evaluate(()=>globalThis.__sourceCopyProbe.restore());
 await tap();await pause(1200);const recovered=await read();assert.equal(recovered.success,true);assert.equal(recovered.failure,false);
 result={failure,recovered,lane:'compiled-component; injected clipboard failure then native copy retry'};
}finally{await p.evaluate(()=>{globalThis.__sourceCopyProbe?.restore();delete globalThis.__sourceCopyProbe;});await writeFile('artifacts/miniapp/source-copy-runtime.json',JSON.stringify(result??{incomplete:true},null,2));await p.disconnect();}
console.log(JSON.stringify(result));
