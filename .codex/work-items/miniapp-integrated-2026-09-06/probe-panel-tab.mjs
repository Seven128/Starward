import automator from 'miniprogram-automator';
import { writeFile } from 'node:fs/promises';
const timeout=setTimeout(()=>process.exit(2),15000);
const program=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try {
 const index=process.argv[2]==='overview'?0:1;
 const action=await program.evaluate(index=>new Promise(resolve=>{
  const query=wx.createSelectorQuery();
  query.selectAll('.spot-panel__section-tab').fields({dataset:true});
  query.select('.map-panel-layer').fields({dataset:true});
  query.exec(results=>{
   const sid=results[0]?.[index]?.dataset?.sid,parentSid=results[1]?.dataset?.sid;
   if(!sid||!parentSid)return resolve('target_missing');
   const page=getCurrentPages().at(-1),target={id:sid,dataset:{sid}};
   // Component-level event test: preserve Taro's actual parent batching path.
   // This is not evidence of native touch hit testing.
   page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});
   page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:{id:parentSid,dataset:{sid:parentSid}},detail:{}});
   resolve('component_event_dispatched');
  });
 }),index);
 await new Promise(resolve=>setTimeout(resolve,700));
 const geometry=await program.evaluate(()=>new Promise(resolve=>{
  const query=wx.createSelectorQuery();
  for(const selector of ['.spot-panel','.spot-panel--large','.spot-panel__section-rail','#spot-panel-overview','#spot-panel-astronomy','.spot-panel__section-tab--active']) query.select(selector).boundingClientRect();
  query.exec(resolve);
 }));
 const result={lane:'fixture9421-component-event-not-native-touch',index,action,geometry};
 const path=`artifacts/miniapp/panel-light-tabs-${index}-runtime.json`;
 await writeFile(path,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally { program.disconnect();clearTimeout(timeout); }
