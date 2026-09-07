import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
try {
 const result=await p.evaluate(()=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('geometry_timeout')),5000);
  wx.createSelectorQuery().selectAll('.profile-links-platform-grid .chip').boundingClientRect().selectAll('.profile-links-field-group .field').boundingClientRect().select('.profile-links-editor .soft-button').boundingClientRect().select('.profile-links-list').boundingClientRect().exec(rects=>{clearTimeout(timer);resolve({route:getCurrentPages().at(-1).route,viewport:wx.getWindowInfo().windowWidth,rects});});
 }));
 assert.equal(result.route,'content/profile/links/index');
 const [chips,fields,save,list]=result.rects;
 assert.equal(chips.length,4);assert.equal(fields.length,2);
 for(const rect of [...chips,...fields,save]){assert.ok(rect.height>=44);assert.ok(rect.left>=0&&rect.right<=result.viewport);}
 assert.ok(list.top>=save.bottom);
 await writeFile('artifacts/miniapp/links-layout-runtime.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({width:result.viewport,chipCount:chips.length,fieldCount:fields.length,saveHeight:save.height,withinViewport:true}));
}finally{await p.disconnect();}
