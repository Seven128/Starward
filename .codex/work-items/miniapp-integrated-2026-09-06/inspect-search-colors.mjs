import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{const result=await p.evaluate(()=>new Promise(resolve=>{const timer=setTimeout(()=>resolve({timeout:true}),5000);wx.createSelectorQuery().selectAll('.spot-search-filter-choice').fields({computedStyle:['color','opacity','background-color'],properties:['disabled'],rect:true},nodes=>{clearTimeout(timer);resolve(nodes);}).exec();}));await writeFile('artifacts/miniapp/search-filter-colors.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}finally{await p.disconnect();}
