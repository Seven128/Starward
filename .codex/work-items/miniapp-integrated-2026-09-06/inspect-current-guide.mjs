import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{const result=await p.evaluate(()=>{const page=getCurrentPages().at(-1),text=[],labels=[];function scan(n){if(!n||typeof n!=='object')return;if(typeof n.v==='string')text.push(n.v);if(n.ariaLabel)labels.push(n.ariaLabel);for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);return{route:page.route,text,labels};});await writeFile('artifacts/miniapp/guide-content-current.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await p.disconnect();}
