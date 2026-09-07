import automator from 'miniprogram-automator';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try{console.log(JSON.stringify(await p.evaluate(()=>({route:getCurrentPages().at(-1)?.route,back:String(wx.navigateBack).slice(0,2000),tab:String(wx.switchTab).slice(0,2000),to:String(wx.navigateTo).slice(0,2000)}))));}finally{await p.disconnect();}
