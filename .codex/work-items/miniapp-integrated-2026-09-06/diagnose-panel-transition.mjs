import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const timer=setTimeout(()=>process.exit(2),15000),p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{const result=await p.evaluate(()=>new Promise(resolve=>{
 const page=getCurrentPages().at(-1);let path,previous;
 function scan(n,k){if(!n||typeof n!=='object')return;if(n.cl?.startsWith('spot-panel ')){path=k+'.st';previous=n.st??'';return;}for(const [key,v] of Object.entries(n))if(typeof v==='object')scan(v,k?(Array.isArray(n)?k+'['+key+']':k+'.'+key):key)}scan(page.data,'');
 if(!path)return resolve({error:'missing_panel'});
 const measure=done=>{const q=wx.createSelectorQuery();q.select('.spot-panel').fields({computedStyle:['height','transition-property','transition-duration']});q.exec(done)};
 measure(before=>page.setData({[path]:previous+';transition:none;'},()=>measure(withTransitionDisabled=>page.setData({[path]:previous},()=>measure(restored=>resolve({lane:'temporary-presentation-diagnostic-not-product-acceptance',before,withTransitionDisabled,restored}))))));
}));await writeFile('artifacts/miniapp/panel-transition-diagnostic.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{p.disconnect();clearTimeout(timer)}
