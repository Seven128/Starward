import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function observe(){return p.evaluate(()=>{const page=getCurrentPages().at(-1);let failed=false;function scan(n){if(!n||typeof n!=='object')return;if(n.v==='设置暂未打开')failed=true;for(const v of Object.values(n))if(typeof v==='object')scan(v)}scan(page.data);return {route:page.route,failed,intercepted:globalThis.__settingsNavigationProbe?.count??0};});}
async function tap(){return p.evaluate(()=>{const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel==='打开设置'||n['aria-label']==='打开设置')sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v)}scan(page.data);if(!sid)throw Error('settings_entry_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});});}
let result;
try{
await p.evaluate(()=>{wx.switchTab({url:'/pages/my/index'});});
await pause(2000);
if((await observe()).route!=='pages/my/index')throw Error('my_not_ready');
await p.evaluate(()=>{if(globalThis.__settingsNavigationProbe)throw Error('probe_exists');const original=wx.navigateTo;const state={count:0,restore(){wx.navigateTo=original;}};globalThis.__settingsNavigationProbe=state;wx.navigateTo=function(options){if(options.url==='/content/settings/index'){state.count++;const error={errMsg:'navigateTo:fail isolated navigation probe'};setTimeout(()=>{options.fail?.(error);options.complete?.(error);},0);return;}return original.call(wx,options);};setTimeout(state.restore,15000);});
await tap();await pause(1500);const failed=await observe();
await p.evaluate(()=>globalThis.__settingsNavigationProbe.restore());
if(failed.intercepted!==1||!failed.failed)throw Error('failure_feedback_not_observed');
await tap();await pause(2500);const opened=await observe();
if(opened.route!=='content/settings/index')throw Error('settings_recovery_not_opened');
await p.evaluate(()=>{wx.navigateBack({});});await pause(1500);const returned=await observe();
result={lane:'isolated-navigation-failure-and-component-events',failed,opened,returned};
if(returned.route!=='pages/my/index'||returned.failed)throw Error('old_failure_not_cleared');
}finally{await p.evaluate(()=>{globalThis.__settingsNavigationProbe?.restore();delete globalThis.__settingsNavigationProbe;});await p.disconnect();}
await writeFile('artifacts/miniapp/my-navigation-failure-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
