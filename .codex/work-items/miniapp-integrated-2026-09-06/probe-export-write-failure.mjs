import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let result;
try{
 await p.evaluate(()=>{wx.navigateTo({url:'/content/settings/index'});});await pause(2000);
 await p.evaluate(()=>{const get=wx.getFileSystemManager,share=wx.shareFileMessage;const state={writes:0,shares:0,restore(){wx.getFileSystemManager=get;wx.shareFileMessage=share;clearTimeout(state.timer);}};globalThis.__exportWriteProbe=state;wx.getFileSystemManager=function(){const fs=get.call(wx);return{...fs,writeFile(options){if(String(options.filePath).includes('/starward-account-')){state.writes++;setTimeout(()=>options.fail?.({errMsg:'writeFile:fail isolated disk failure'}),0);return;}return fs.writeFile(options);}};};wx.shareFileMessage=function(options){state.shares++;setTimeout(()=>options.fail?.({errMsg:'shareFileMessage:fail isolated guard'}),0);};state.timer=setTimeout(state.restore,20000);});
 await p.evaluate(()=>{const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith('下载我的数据；'))sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('export_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});});
 await pause(2500);result=await p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,writes:globalThis.__exportWriteProbe.writes,shares:globalThis.__exportWriteProbe.shares,text:text.filter(t=>/导出|文件已生成|操作未完成/.test(t))};});
 assert.equal(result.writes,1);assert.equal(result.shares,0);assert.ok(result.text.includes('账户数据导出失败'));assert.ok(!result.text.some(t=>t.includes('文件已生成')));
}finally{await p.evaluate(()=>{globalThis.__exportWriteProbe?.restore();delete globalThis.__exportWriteProbe;});await writeFile('artifacts/miniapp/export-write-failure-runtime.json',JSON.stringify(result??{incomplete:true},null,2));await p.disconnect();}
console.log(JSON.stringify(result));
