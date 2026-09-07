import automator from 'miniprogram-automator';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{console.log(JSON.stringify(await p.evaluate(()=>{const probe=globalThis.__searchReturnProbe;probe?.restore();delete globalThis.__searchReturnProbe;return{hadProbe:Boolean(probe),cleared:!globalThis.__searchReturnProbe,route:getCurrentPages().at(-1)?.route};})));}finally{await p.disconnect();}
