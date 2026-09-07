import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
try{
 await p.evaluate(()=>{wx.navigateTo({url:'/spot/search/index'});});await pause(2000);
 result=await p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[],values=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);if(n.cl==='spot-search-field__input')values.push(Object.fromEntries(Object.entries(n).filter(([key,value])=>key!=="sid"&&typeof value!=="object")));for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text,values};});
 assert.equal(result.route,'spot/search/index');assert.ok(result.text.length>0);assert.ok(!result.text.includes('暂时无法返回地图'));assert.deepEqual(result.values.map(n=>n.p25),['自动化测试正式观星点']);
}finally{await p.evaluate(()=>{wx.switchTab({url:'/pages/map/index'});});await pause(1500);await writeFile('artifacts/miniapp/search-reopen-runtime.json',JSON.stringify(result,null,2));await p.disconnect();}
console.log(JSON.stringify({route:result.route,oldWarning:false,values:result.values}));
