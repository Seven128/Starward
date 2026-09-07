import automator from 'miniprogram-automator';
const timer=setTimeout(()=>process.exit(2),15000);
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try { console.log(JSON.stringify(await p.evaluate(()=>new Promise(resolve=>{
 const q=wx.createSelectorQuery();q.select('#spot-map').fields({id:true,dataset:true,properties:['markers']});q.select('.map-page').fields({dataset:true});q.exec(r=>resolve({route:getCurrentPages().at(-1).route,nodes:r}));
}))));}finally{p.disconnect();clearTimeout(timer);}
