import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function waitRoute(expected){for(let i=0;i<12;i++){const page=await p.evaluate(()=>({route:getCurrentPages().at(-1).route,options:getCurrentPages().at(-1).options}));if(page.route===expected)return page;await pause(500);}throw Error('route_did_not_settle:'+expected);}
let result;
try{
 if(await p.evaluate(()=>getCurrentPages().at(-1).route)==='content/article/detail/index'){await p.evaluate(()=>wx.navigateBack({}));await waitRoute('spot/guides/index');await pause(500);}
 const before=await p.evaluate(()=>new Promise((resolve,reject)=>{
  const page=getCurrentPages().at(-1),timer=setTimeout(()=>reject(Error('geometry_timeout')),5000);
  wx.createSelectorQuery().select('.guide-card').boundingClientRect().select('.guide-card__media').boundingClientRect().select('.guide-card__footer .soft-button').boundingClientRect().exec(rects=>{clearTimeout(timer);resolve({route:page.route,options:page.options,rects});});
 }));
 assert.equal(before.route,'spot/guides/index');
 const [card,media,button]=before.rects;assert.equal(media.width,72);assert.equal(media.height,72);assert.ok(button.height>=44);assert.ok(button.right<=card.right);
 await p.evaluate(()=>{
  const page=getCurrentPages().at(-1);let sid;function scan(n){if(!n||typeof n!=='object')return;if(n.ariaLabel?.startsWith('阅读攻略 '))sid=n.sid;for(const v of Object.values(n))if(typeof v==='object')scan(v);}scan(page.data);if(!sid)throw Error('article_missing');const target={id:sid,dataset:{sid}};page.eh({type:'tap',timeStamp:Date.now(),target,currentTarget:target,detail:{}});
 });
 await pause(2400);
 const article=await waitRoute('content/article/detail/index');
 assert.equal(article.route,'content/article/detail/index');
 const decode=value=>decodeURIComponent(value??'');
 assert.equal(decode(article.options.spotId),decode(before.options.spotId));assert.equal(decode(article.options.contextId),decode(before.options.contextId));
 await p.evaluate(()=>wx.navigateBack({}));await pause(1200);
 const returned=await waitRoute('spot/guides/index');
 assert.equal(returned.route,'spot/guides/index');assert.equal(decode(returned.options.contextId),decode(before.options.contextId));
 result={card:{width:card.width,height:card.height},media:{width:media.width,height:media.height},button:{width:button.width,height:button.height},articleOpened:true,sameSpotAndContext:true,returnedRoute:returned.route};
}finally{await p.disconnect();await writeFile('artifacts/miniapp/guide-card-reading-runtime.json',JSON.stringify(result??{incomplete:true},null,2));}
console.log(JSON.stringify(result));
