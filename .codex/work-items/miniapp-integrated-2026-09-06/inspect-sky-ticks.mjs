import automator from 'miniprogram-automator';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{console.log(JSON.stringify(await p.evaluate(()=>{const page=getCurrentPages().at(-1),ticks=[];function scan(n){if(!n||typeof n!=='object')return;if(n.cl?.includes('sky-orientation-time-ruler__tick')&&!n.cl.includes('mark')&&!n.cl.includes('label'))ticks.push({sid:n.sid,cl:n.cl,label:n.ariaLabel});for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,ticks};})));}finally{await p.disconnect();}
