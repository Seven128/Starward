import automator from 'miniprogram-automator';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try { const result=await p.evaluate(()=>{const date=new Date('2026-09-06T16:30:00Z');const base={timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'};return{old:new Intl.DateTimeFormat('zh-CN',{...base,hour12:false}).format(date),fixed:new Intl.DateTimeFormat('zh-CN',{...base,hourCycle:'h23'}).format(date)};});await writeFile('artifacts/miniapp/midnight-format-runtime.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!/00:30/.test(result.fixed))throw Error('runtime_hour_cycle_failed');}finally{await p.disconnect();}
