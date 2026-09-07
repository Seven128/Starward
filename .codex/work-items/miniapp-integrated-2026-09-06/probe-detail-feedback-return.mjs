import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
try {
 await p.evaluate(()=>{
  if(getCurrentPages().at(-1).route!=='spot/field/index')throw Error('requires_field');
  const original=wx.request;
  const before={};for(const key of wx.getStorageInfoSync().keys)if(key.startsWith('starward.')&&/draft|contribution-submit/.test(key))before[key]=JSON.stringify(wx.getStorageSync(key));
  const state={before,blockedWrites:0,restore(){wx.request=original;clearTimeout(state.timer);}};
  globalThis.__feedbackReturnProbe=state;
  wx.request=function(options){if(/\/contributions(?:\/|\?|$)/.test(String(options.url))&&(options.method||'GET').toUpperCase()!=='GET'){state.blockedWrites++;setTimeout(()=>options.fail?.({errMsg:'request:fail isolated write guard'}),0);return{abort(){}};}return original.call(wx,options);};
  state.timer=setTimeout(state.restore,20000);
  const page=getCurrentPages().at(-1);let sid;
  function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith('反馈 ')&&n.ariaLabel.endsWith('的现场情况或资料错误'))sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);
  if(!sid)throw Error('feedback_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});
 });
 await pause(2300);
 const opened=await p.evaluate(()=>{const page=getCurrentPages().at(-1);return{route:page.route,spotId:page.options.spotId};});
 assert.equal(opened.route,'content/contribution/index');assert.equal(decodeURIComponent(opened.spotId),'spot:test-published');
 await p.evaluate(()=>wx.navigateBack({}));await pause(1200);
 result=await p.evaluate(()=>{
  const page=getCurrentPages().at(-1),text=[],state=globalThis.__feedbackReturnProbe;
  function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);
  const currentKeys=wx.getStorageInfoSync().keys.filter(key=>key.startsWith('starward.')&&/draft|contribution-submit/.test(key));
  return{route:page.route,oldFailureVisible:text.includes('反馈表单暂未打开'),existingDrafts:Object.keys(state.before).length,existingDraftsUnchanged:Object.entries(state.before).every(([key,value])=>JSON.stringify(wx.getStorageSync(key))===value),addedDrafts:currentKeys.filter(key=>!(key in state.before)).length,blockedWrites:state.blockedWrites};
 });
 assert.equal(result.route,'spot/field/index');assert.equal(result.oldFailureVisible,false);assert.equal(result.existingDraftsUnchanged,true);assert.equal(result.blockedWrites,0);
 result={opened,...result};
}finally{await p.evaluate(()=>{globalThis.__feedbackReturnProbe?.restore();delete globalThis.__feedbackReturnProbe;});await p.disconnect();await writeFile('artifacts/miniapp/detail-feedback-return-runtime.json',JSON.stringify(result??{incomplete:true},null,2));}
console.log(JSON.stringify(result));
