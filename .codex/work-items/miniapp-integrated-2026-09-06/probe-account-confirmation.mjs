import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
try {
 await p.evaluate(()=>wx.navigateTo({url:'/content/settings/index'}));await pause(2000);
 await p.evaluate(()=>{
  const modal=wx.showModal,request=wx.request;
  const state={modals:0,requests:0,pending:null,restore(){wx.showModal=modal;wx.request=request;clearTimeout(state.timer);}};
  globalThis.__accountConfirmProbe=state;
  wx.showModal=function(options){state.modals++;state.pending=options;};
  wx.request=function(options){
   if(/\/me\/(account|data-export)(?:\?|$)/.test(options.url)){
    state.requests++;setTimeout(()=>options.fail?.({errMsg:'request:fail isolated account guard'}),0);return{abort(){}};
   }
   return request.call(wx,options);
  };
  state.timer=setTimeout(state.restore,20000);
 });
 const tap=()=>p.evaluate(()=>{
  const page=getCurrentPages().at(-1);let sid;
  function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith('删除账户；'))sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}
  scan(page.data);if(!sid)throw Error('delete_control_missing');
  const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});
 });
 await tap();await tap();
 const before=await p.evaluate(()=>({modals:globalThis.__accountConfirmProbe.modals,requests:globalThis.__accountConfirmProbe.requests}));
 assert.equal(before.modals,1);assert.equal(before.requests,0);
 await p.evaluate(()=>globalThis.__accountConfirmProbe.pending.fail?.({errMsg:'showModal:fail isolated unavailable'}));await pause(500);
 const failure=await p.evaluate(()=>{const texts=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')texts.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(getCurrentPages().at(-1).data);return texts.includes('账户未删除');});
 assert.equal(failure,true);
 await tap();
 await p.evaluate(()=>globalThis.__accountConfirmProbe.pending.success?.({confirm:false,cancel:true}));await pause(300);
 result=await p.evaluate(()=>({route:getCurrentPages().at(-1).route,modals:globalThis.__accountConfirmProbe.modals,requests:globalThis.__accountConfirmProbe.requests}));
 assert.equal(result.modals,2);assert.equal(result.requests,0);
 result={...result,failureVisible:failure,duplicateModalSuppressed:true,retryCancelled:true};
} finally {
 await p.evaluate(()=>{globalThis.__accountConfirmProbe?.restore();delete globalThis.__accountConfirmProbe;});
 await writeFile('artifacts/miniapp/account-confirmation-runtime.json',JSON.stringify(result??{incomplete:true},null,2));
 await p.disconnect();
}
console.log(JSON.stringify(result));
