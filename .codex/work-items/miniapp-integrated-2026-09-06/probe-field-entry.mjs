import automator from 'miniprogram-automator';
const timer=setTimeout(()=>process.exit(2),15000),p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{console.log(JSON.stringify(await p.evaluate(()=>{
 const page=getCurrentPages().at(-1);let button,parent;
 function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel==='查看完整场地资料')button=n.sid;if(n.cl?.startsWith('map-panel-layer'))parent=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v)}scan(page.data);
 if(!button||!parent)return {route:page.route,status:'entry_missing'};
 const target={id:button,dataset:{sid:button}};
 page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});
 page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:{id:parent,dataset:{sid:parent}},detail:{}});
 return {lane:'component-event-not-native-touch',status:'dispatched'};
})));}finally{p.disconnect();clearTimeout(timer)}
