import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function tap(match){await p.evaluate(match=>{const page=getCurrentPages().at(-1);let sid,parent;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith(match))sid=n.sid;if(n.cl?.startsWith('map-panel-layer'))parent=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('tick_missing:'+match);const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});if(parent)page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:{id:parent,dataset:{sid:parent}},detail:{}});},match);}
async function read(){return p.evaluate(()=>{const page=getCurrentPages().at(-1),selected=[];function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel&&(n.cl?.includes('tick--selected')||n.ariaLabel.includes('已选择')))selected.push(n.ariaLabel);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,selected};});}
let result;
try{const before=await read();await tap('下午09:20，第');await pause(2500);const sky=await read();await p.evaluate(()=>{wx.navigateBack({});});await pause(1800);const map=await read();result={before,sky,map};}
finally{await p.evaluate(()=>{if(getCurrentPages().at(-1).route!=='pages/map/index')wx.switchTab({url:'/pages/map/index'});});await pause(1000);await tap('09/06 21:00');await pause(2000);if(result)result.restored=await read();await p.disconnect();}
await writeFile('artifacts/miniapp/sky-time-selection-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
if(!result.sky.selected.some(s=>s.includes('09:20'))||!result.map.selected.some(s=>s.includes('21:20'))||!result.restored.selected.some(s=>s.includes('21:00')))throw Error('time_not_preserved');
