import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function observe(){return p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[],labels=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);if(n.ariaLabel)labels.push(n.ariaLabel);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text,labels,intercepted:globalThis.__articleSiteProbe?.count??0};});}
async function tap(label){return p.evaluate(label=>{const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel===label)sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('entry_missing:'+label);const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});},label);}
let result;
try{
 await p.evaluate(()=>{if(getCurrentPages().at(-1).route==='content/article/detail/index')wx.navigateBack({});});await pause(45000);const before=await observe();if(before.route!=='spot/guides/index')throw Error('requires_guide_page');
 const entry=before.labels.find(s=>s.startsWith('阅读攻略 '));if(!entry)throw Error('article_missing');
 await p.evaluate(()=>{if(globalThis.__articleSiteProbe)throw Error('probe_exists');const original=wx.request;const state={count:0,restore(){wx.request=original;}};globalThis.__articleSiteProbe=state;wx.request=function(options){if(String(options.url).startsWith('http://127.0.0.1:8879/')&&/\/field(?:\?|$)/.test(options.url)){state.count++;const timer=setTimeout(()=>{const error={errMsg:'request:fail isolated article site probe'};options.fail?.(error);options.complete?.(error);},0);return{abort(){clearTimeout(timer);}};}return original.call(wx,options);};setTimeout(state.restore,15000);});
 await tap(entry);await pause(4500);const failed=await observe();
 await p.evaluate(()=>globalThis.__articleSiteProbe.restore());
 result={lane:'9421-component-event-isolated-site-request-failure',before,failed};
 if(failed.intercepted>0&&failed.labels.includes('重试设施资料')){await tap('重试设施资料');await pause(2500);result.recovered=await observe();}
 await writeFile('artifacts/miniapp/article-site-failure-runtime.json',JSON.stringify(result,null,2));
 if(!result.recovered)throw Error('site_recovery_not_exercised');
 if(result.recovered.labels.includes('重试设施资料'))throw Error('site_recovery_still_failed');
 console.log(JSON.stringify({route:failed.route,intercepted:failed.intercepted,failedText:failed.text,recoveredText:result.recovered.text}));
}finally{await p.evaluate(()=>{globalThis.__articleSiteProbe?.restore();delete globalThis.__articleSiteProbe;});await p.disconnect();}

