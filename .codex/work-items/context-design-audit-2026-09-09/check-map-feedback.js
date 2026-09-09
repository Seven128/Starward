async page=>{
 const base='http://127.0.0.1:5329/docs/design-resources/wechat-miniapp/map/candidates/context-audit-2026-09-09/';await page.goto(base+'review.html');await page.setViewportSize({width:1100,height:980});
 const f=page.frameLocator('#map'),p=f.frameLocator('#spot-frame'),assert=(v,m)=>{if(!v)throw Error(m)};
 await page.getByRole('button',{name:'审核中提案',exact:true}).click();await p.getByText('仅你可见 · 待审核资料',{exact:true}).waitFor();
 await f.locator('#spot-presentation').evaluate(e=>{window.panelFlashes=[];new MutationObserver(()=>{if(e.hidden||getComputedStyle(e).display==='none')window.panelFlashes.push('hidden')}).observe(e,{attributes:true});});
 for(const label of ['正式点与我的反馈','我的草稿','审核中提案']){await page.getByRole('button',{name:label,exact:true}).click();await f.locator('.spot-buffer:not(#spot-frame)').waitFor({state:'detached'});}
 assert(await f.locator('#phone').evaluate(()=>window.panelFlashes.length)===0,'panel was hidden during retarget');
 await p.locator('#handle-band').press('Home');await p.locator('body[data-extent=small]').waitFor();
 const before=await f.locator('#spot-presentation').boundingBox();const box=await p.locator('#document').boundingBox();
 await page.mouse.move(box.x+120,box.y+35);await page.mouse.down();await page.mouse.move(box.x+120,box.y+100,{steps:10});await page.mouse.up();
 const after=await f.locator('#spot-presentation').boundingBox();assert(Math.abs(before.y-after.y)<1,'small moved down');assert(await f.locator('#spot-presentation').isVisible(),'small dismissed');
 await page.mouse.move(box.x+120,box.y+65);await page.mouse.down();await page.mouse.move(box.x+120,box.y-100,{steps:10});await page.mouse.up();await p.locator('body[data-extent=medium]').waitFor();
 const mid=await p.locator('#document').boundingBox();await page.mouse.move(mid.x+100,mid.y+100);await page.mouse.wheel(0,160);await p.locator('#document').evaluate(e=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(e.scrollTop))))).then(v=>assert(v>0,'medium did not scroll'));
 await p.locator('#handle-band').press('End');await p.locator('body[data-extent=large]').waitFor();
 for(const width of [320,375,390,430]){await page.locator('#width').selectOption(String(width));const g=await f.locator('#spot-presentation').evaluate(e=>({top:e.getBoundingClientRect().top,width:e.getBoundingClientRect().width}));assert(Math.abs(g.top-88)<1,'large top gap: '+g.top);await page.locator('#map').screenshot({path:'output/playwright/map-feedback-large-'+width+'.png'});}
 const phone=await f.locator('#phone').boundingBox();await page.mouse.click(phone.x+170,phone.y+85);assert(await f.locator('#spot-presentation').isVisible(),'top seam dismissed');
}
