import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
try{
 await p.evaluate(()=>{wx.switchTab({url:'/pages/map/index'});});await pause(1500);
 await p.evaluate(()=>{const names=['setTabBarStyle','setTabBarItem','setBackgroundColor'],original=Object.fromEntries(names.map(name=>[name,wx[name]]));const state={calls:[],restore(){for(const name of names)wx[name]=original[name];clearTimeout(state.timer);}};globalThis.__chromeScopeProbe=state;for(const name of names)wx[name]=function(options){state.calls.push({name,route:getCurrentPages().at(-1)?.route});return original[name].call(wx,options);};state.timer=setTimeout(state.restore,20000);});
 await p.evaluate(()=>{wx.navigateTo({url:'/spot/search/index'});});await pause(2000);
 const child=await p.evaluate(()=>({route:getCurrentPages().at(-1)?.route,calls:globalThis.__chromeScopeProbe.calls.slice()}));
 assert.equal(child.route,'spot/search/index');assert.ok(child.calls.some(c=>c.name==='setBackgroundColor'&&c.route==='spot/search/index'));assert.ok(!child.calls.some(c=>c.name.startsWith('setTabBar')&&c.route==='spot/search/index'));
 await p.evaluate(()=>{globalThis.__chromeScopeProbe.calls=[];wx.switchTab({url:'/pages/map/index'});});await pause(1800);
 const returned=await p.evaluate(()=>({route:getCurrentPages().at(-1)?.route,calls:globalThis.__chromeScopeProbe.calls.slice()}));result={child,returned};assert.equal(returned.route,'pages/map/index');assert.ok(returned.calls.some(c=>c.name==='setTabBarItem'));
}finally{await p.evaluate(()=>{globalThis.__chromeScopeProbe?.restore();delete globalThis.__chromeScopeProbe;}).catch(()=>{});await writeFile('artifacts/miniapp/native-chrome-scope-runtime.json',JSON.stringify(result??{incomplete:true},null,2));await p.disconnect();}
console.log(JSON.stringify(result));
