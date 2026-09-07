import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const timeout=setTimeout(()=>process.exit(2),20000),p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{
 const events=[];
 for(const index of [0,1,0,1]){
 events.push(await p.evaluate(index=>new Promise(resolve=>{
 const q=wx.createSelectorQuery();q.selectAll('.spot-panel__extent-button').fields({dataset:true});q.select('.map-panel-layer').fields({dataset:true});q.exec(r=>{const sid=r[0]?.[index]?.dataset?.sid,parent=r[1]?.dataset?.sid;if(!sid||!parent)return resolve('missing');const page=getCurrentPages().at(-1),target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:{id:parent,dataset:{sid:parent}},detail:{}});resolve({index})})
 }),index)); await new Promise(r=>setTimeout(r,100));
 }
 await new Promise(r=>setTimeout(r,1200));
 const state=await p.evaluate(()=>new Promise(resolve=>{const q=wx.createSelectorQuery();q.select('.spot-panel').fields({dataset:true,rect:true,size:true,computedStyle:['height']});q.select('.spot-panel--large').boundingClientRect();q.exec(resolve)}));
 const result={lane:'component-events-not-native-touch',events,state};await writeFile('artifacts/miniapp/panel-rapid-extent-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{p.disconnect();clearTimeout(timeout)}
