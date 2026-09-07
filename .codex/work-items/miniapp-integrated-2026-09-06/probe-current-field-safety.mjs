import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const {base}=JSON.parse(await readFile('artifacts/miniapp/current-map-probe-address.json','utf8'));
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
let result;
try {
 await p.evaluate(base=>{
  const original=wx.request,state={count:0,fieldRequests:0,restore(){wx.request=original;clearTimeout(state.timer);}};
  globalThis.__fieldSafetyProbe=state;
  wx.request=function(options){
   const url=String(options.url);
   if(url.startsWith('http://127.0.0.1:8879/')&&/\/spots\/spot(?::|%3A)test-published\/(overview|field)(?:\?|$)/i.test(url)) {
    state.count++;if(/\/field(?:\?|$)/.test(url))state.fieldRequests++;return original.call(wx,{...options,url:base+url.slice('http://127.0.0.1:8879'.length)});
   }
   return original.call(wx,options);
  };
  state.timer=setTimeout(state.restore,45000);
 },base);
 await promisify(execFile)(process.execPath,['.codex/work-items/miniapp-integrated-2026-09-06/open-current-sources.mjs','field'],{timeout:20000});
 await new Promise(r=>setTimeout(r,2500));
 result=await p.evaluate(()=>{
  const page=getCurrentPages().at(-1),text=[];
  function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);
  return{route:page.route,requests:globalThis.__fieldSafetyProbe.count,fieldRequests:globalThis.__fieldSafetyProbe.fieldRequests,testLabel:text.includes('测试数据 · 不用于现实判断'),oldInternalRisk:text.some(t=>/仅为自动化测试状态|测试夹具只验证正式数据形状/.test(t)),safetyPresent:text.includes('夜间安全与限制'),cautionPresent:text.includes('夜间需谨慎'),feedbackPresent:text.includes('反馈现场情况')};
 });
 assert.equal(result.route,'spot/field/index');assert.ok(result.fieldRequests>=1);
 assert.equal(result.oldInternalRisk,false);assert.equal(result.testLabel,true);assert.equal(result.safetyPresent,true);assert.equal(result.cautionPresent,true);assert.equal(result.feedbackPresent,true);
}finally{await p.evaluate(()=>{globalThis.__fieldSafetyProbe?.restore();delete globalThis.__fieldSafetyProbe;});await p.disconnect();await writeFile('artifacts/miniapp/current-field-safety-runtime.json',JSON.stringify(result??{incomplete:true},null,2));}
console.log(JSON.stringify(result));
