import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
let result;
try {
 await p.evaluate(()=>{
  if(getCurrentPages().at(-1).route!=='spot/field/index')throw Error('requires_field');
  const original=wx.navigateTo,state={calls:0,restore(){wx.navigateTo=original;clearTimeout(state.timer);}};
  globalThis.__feedbackNavigationProbe=state;
  wx.navigateTo=function(options){if(options.url.startsWith('/content/contribution/index')){state.calls++;setTimeout(()=>options.fail?.({errMsg:'navigateTo:fail isolated unavailable'}),250);return;}return original.call(wx,options);};
  state.timer=setTimeout(state.restore,15000);
 });
 await p.evaluate(()=>{
  const page=getCurrentPages().at(-1);let sid;
  function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith('反馈 ')&&n.ariaLabel.endsWith('的现场情况或资料错误'))sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);
  if(!sid)throw Error('feedback_missing');const target={id:sid,dataset:{sid}};
  for(let i=0;i<2;i++)page.eh({type:'tap',timeStamp:Date.now()+i,target,currentTarget:target,detail:{}});
 });
 await new Promise(r=>setTimeout(r,800));
 result=await p.evaluate(()=>{
  const page=getCurrentPages().at(-1),text=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);
  return{route:page.route,calls:globalThis.__feedbackNavigationProbe.calls,failureVisible:text.includes('反馈表单暂未打开'),facilitiesRetained:text.includes('场地条件'),safetyRetained:text.includes('夜间安全与限制')};
 });
 assert.equal(result.route,'spot/field/index');assert.equal(result.calls,1);assert.equal(result.failureVisible,true);assert.equal(result.facilitiesRetained,true);assert.equal(result.safetyRetained,true);
}finally{await p.evaluate(()=>{globalThis.__feedbackNavigationProbe?.restore();delete globalThis.__feedbackNavigationProbe;});await p.disconnect();await writeFile('artifacts/miniapp/detail-feedback-failure-runtime.json',JSON.stringify(result??{incomplete:true},null,2));}
console.log(JSON.stringify(result));
