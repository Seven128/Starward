import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function read(){return p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[],inputs=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);if(n.nn==='input')inputs.push(n.value);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text,inputs,calls:globalThis.__searchReturnProbe?.calls??[]};});}
async function tap(){await p.evaluate(()=>{const page=getCurrentPages().at(-1);let sid,parent,root;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel==='返回地图')sid=n.sid;if(n.cl==='spot-search-field')parent=n.sid;if(n.cl?.split(' ').includes('spot-search-page'))root=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid||!parent||!root)throw Error('return_chain_missing');const target={id:sid,dataset:{sid}},timeStamp=Date.now();for(const current of [sid,parent,root])page.eh({type:'tap',timeStamp,target,currentTarget:{id:current,dataset:{sid:current}},detail:{}});});}
const result={};
try{
 await p.evaluate(()=>{wx.switchTab({url:'/pages/map/index'});});await pause(1200);await p.evaluate(()=>{wx.navigateTo({url:'/spot/search/index'});});await pause(2000);for(let i=0;i<8;i++){result.before=await read();if(result.before.text.length)break;await pause(500);}assert.equal(result.before.route,'spot/search/index');
 await p.evaluate(()=>{const back=wx.navigateBack,tab=wx.switchTab;const restore=()=>{wx.navigateBack=back;wx.switchTab=tab;};globalThis.__searchReturnProbe={restore,calls:[]};const fail=options=>{globalThis.__searchReturnProbe.calls.push("navigation");setTimeout(()=>{const error={errMsg:'navigate:fail isolated verification'};options?.fail?.(error);options?.complete?.(error);},0);};wx.navigateBack=fail;wx.switchTab=fail;setTimeout(restore,15000);});
 await tap();await pause(1800);result.failed=await read();assert.equal(result.failed.route,'spot/search/index');assert.ok(result.failed.text.includes('暂时无法返回地图'));assert.deepEqual(result.failed.inputs,result.before.inputs);
 await p.evaluate(()=>{globalThis.__searchReturnProbe.restore();delete globalThis.__searchReturnProbe;});await tap();await pause(1800);result.recovered=await read();assert.equal(result.recovered.route,'pages/map/index');
}finally{await p.evaluate(()=>{globalThis.__searchReturnProbe?.restore();delete globalThis.__searchReturnProbe;}).catch(()=>{});await writeFile('artifacts/miniapp/search-return-runtime.json',JSON.stringify(result,null,2));await p.disconnect();}
console.log(JSON.stringify({failure:result.failed.text.filter(t=>t.includes('返回')||t.includes('保留')),recovered:result.recovered.route}));
