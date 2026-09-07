import automator from 'miniprogram-automator';import {writeFile} from 'node:fs/promises';
const timer=setTimeout(()=>process.exit(2),15000),p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{const result=await p.evaluate(()=>new Promise(resolve=>{
 const selectors=['.facility-row','.facility-evidence__facts','.safety-card','.spot-detail__scroll','.status-panel'];const q=wx.createSelectorQuery();for(const s of selectors)q.selectAll(s).boundingClientRect();q.exec(rows=>{const labels=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')labels.push(n.v);for(const v of Object.values(n))if(typeof v==='object')scan(v)}scan(getCurrentPages().at(-1).data);resolve({route:getCurrentPages().at(-1).route,viewport:wx.getWindowInfo().windowWidth,elements:selectors.map((selector,i)=>({selector,rects:rows[i]})),text:labels})})
}));await writeFile('artifacts/miniapp/field-density-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify({route:result.route,viewport:result.viewport,elements:result.elements.map(e=>({selector:e.selector,count:e.rects?.length,first:e.rects?.[0]})),text:result.text}));}finally{p.disconnect();clearTimeout(timer)}

