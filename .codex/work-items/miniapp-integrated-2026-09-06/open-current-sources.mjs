import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const field = process.argv[2] === 'field';
const guides = process.argv[2] === 'guides';
try {
 await p.evaluate(()=>wx.switchTab({url:'/pages/map/index'}));
 await new Promise(r=>setTimeout(r,2000));
 await p.evaluate(label=>{
  const page=getCurrentPages().at(-1);let button,parent;
  function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel===label)button=n.sid;if(n.cl?.startsWith('map-panel-layer'))parent=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}
  scan(page.data);if(!button)throw Error('source_entry_missing');
  const target={id:button,dataset:{sid:button}},timeStamp=Date.now();
  page.eh({type:'tap',timeStamp,target,currentTarget:target,detail:{}});
  if(parent)page.eh({type:'tap',timeStamp,target,currentTarget:{id:parent,dataset:{sid:parent}},detail:{}});
 }, field ? '查看完整场地资料' : guides ? '查看全部攻略' : '查看完整来源与更新时间');
 await new Promise(r=>setTimeout(r,1800));
 const expectedRoute=field?'spot/field/index':guides?'spot/guides/index':'spot/data-source/index';
 for(let attempt=0;attempt<12;attempt++){
   if(await p.evaluate(()=>getCurrentPages().at(-1).route)===expectedRoute)break;
   await new Promise(r=>setTimeout(r,300));
 }
 const result=await p.evaluate(()=>{
  const page=getCurrentPages().at(-1),text=[];
  function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v);}
  scan(page.data);return{route:page.route,text};
 });
 await writeFile(`artifacts/miniapp/current-${field ? 'field' : guides ? 'guides' : 'source'}-page.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await p.disconnect();}
