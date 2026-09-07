import automator from 'miniprogram-automator';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{console.log(JSON.stringify(await p.evaluate(()=>({route:getCurrentPages().at(-1)?.route,hookNames:Object.keys(top.__global.getHookMethodsCache?.()??{}),navigationHooks:Object.fromEntries(Object.entries(top.__global.getHookMethodsCache?.()??{}).filter(([key])=>["navigateBack","switchTab","navigateTo"].includes(key)))}))));}finally{await p.disconnect();}
