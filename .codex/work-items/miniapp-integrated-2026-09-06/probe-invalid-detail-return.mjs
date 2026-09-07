import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
const read=()=>p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text};});
const tap=label=>p.evaluate(label=>{const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel===label)sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('recovery_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});},label);
try{
 await p.evaluate(()=>wx.navigateTo({url:'/spot/field/index'}));await pause(1800);
 const initial=await read();assert.ok(initial.text.includes('无法确认当前观星点，请返回地图重新选择。'));
 await p.evaluate(()=>{const original=wx.switchTab,state={count:0,restore(){wx.switchTab=original;clearTimeout(state.timer);}};globalThis.__invalidDetailProbe=state;wx.switchTab=function(options){state.count++;setTimeout(()=>options.fail?.({errMsg:'switchTab:fail isolated unavailable'}),0);};state.timer=setTimeout(state.restore,15000);});
 await tap('返回地图');await pause(500);const failed=await read();assert.ok(failed.text.includes('地图暂未打开，请重试。'));assert.equal(failed.route,'spot/field/index');
 await p.evaluate(()=>globalThis.__invalidDetailProbe.restore());await tap('重试返回地图');await pause(1600);
 const recovered=await read();assert.equal(recovered.route,'pages/map/index');
 result={initialHint:true,failureVisible:true,recoveredRoute:recovered.route};
}finally{await p.evaluate(()=>{globalThis.__invalidDetailProbe?.restore();delete globalThis.__invalidDetailProbe;});await p.disconnect();await writeFile('artifacts/miniapp/invalid-detail-return-runtime.json',JSON.stringify(result??{incomplete:true},null,2));}
console.log(JSON.stringify(result));
