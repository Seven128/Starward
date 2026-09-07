import automator from 'miniprogram-automator';
const timer=setTimeout(()=>process.exit(2),15000);
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try { console.log(JSON.stringify(await p.evaluate(()=>new Promise(resolve=>{
 const q=wx.createSelectorQuery();q.select('#spot-map').fields({dataset:true,properties:['markers']});q.exec(r=>{
 const node=r[0],marker=node?.markers?.find(m=>m.label?.content==='01');if(!marker)return resolve('marker_missing');
 const sid=node.dataset.sid,page=getCurrentPages().at(-1),target={id:sid,dataset:{sid}};
 page.eh({type:'markertap',timeStamp:Date.now(),target,currentTarget:target,detail:{markerId:marker.id}});
 resolve({lane:'component-event-not-native-touch',markerId:marker.id});
 });
}))));}finally{p.disconnect();clearTimeout(timer);}
