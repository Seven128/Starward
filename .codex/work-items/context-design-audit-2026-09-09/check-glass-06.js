async page=>{
const root='http://127.0.0.1:5329/docs/design-resources/wechat-miniapp/',assert=(v,m)=>{if(!v)throw Error(m)};
await page.setViewportSize({width:1100,height:920});
await page.goto(root+'sky/candidates/context-audit-2026-09-09/stitch-feedback-06/index.html');await page.screenshot({path:'output/playwright/stitch-glass-06.png'});
await page.setViewportSize({width:1000,height:760});await page.goto(root+'shared/liquid-glass/review.html');await page.locator('#light[data-glass-mode=refractive]').waitFor();await page.screenshot({path:'output/playwright/glass-06-refraction.png'});
await page.getByRole('button',{name:'仅透光（对照）'}).click();await page.screenshot({path:'output/playwright/glass-06-translucent.png'});
await page.getByRole('button',{name:'透光＋折射',exact:true}).click();await page.getByRole('button',{name:'移动背景'}).click();await page.locator('.background').first().evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));await page.screenshot({path:'output/playwright/glass-06-moved.png'});
await page.getByRole('button',{name:'不透明降级'}).click();await page.setViewportSize({width:390,height:844});assert(await page.locator('#light').evaluate(e=>getComputedStyle(e).backdropFilter)==='none','fallback persists on resize');await page.getByRole('button',{name:'透光＋折射',exact:true}).click();
for(const owner of ['sky','my']){
 await page.goto(root+owner+'/candidates/context-audit-2026-09-09/preview/index.html');if(owner==='sky')await page.locator('.target').first().click();const sel=owner==='sky'?'#details':'#plan-card';await page.locator(sel+'[data-glass-mode=refractive]').waitFor();await page.evaluate(()=>document.fonts.ready);
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});await page.locator(sel).evaluate(e=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert(await page.locator('body').evaluate(e=>e.scrollWidth)<=width,'overflow '+owner);await page.screenshot({path:'output/playwright/'+owner+'-glass-06-'+width+'.png'});}
 if(owner==='sky'){await page.setViewportSize({width:390,height:844});await page.locator('.celestial-intro').evaluate(e=>e.textContent=e.textContent.repeat(30));assert(await page.locator('#detail-body').evaluate(e=>{e.scrollTop=100;return e.scrollTop>0}),'long scroll');await page.locator('#close-details').click();await page.locator('.target').first().click();await page.keyboard.press('Escape');assert(!await page.locator('#details').isVisible(),'escape');await page.locator('body').evaluate(()=>window.postMessage({skyScenario:'red'},location.origin));await page.locator('body.red').waitFor();await page.locator('.target').first().click();await page.screenshot({path:'output/playwright/sky-glass-06-red.png'});}
 await page.locator('body').evaluate(e=>e.dataset.solid='true');assert(await page.locator(sel).evaluate(e=>getComputedStyle(e).backdropFilter)==='none','solid '+owner);
}
console.log('PASS: shared consumers at three widths; background refraction/transmission comparisons captured; fallback survives resize; long text, close/reopen, warm-red and solid. No WEAPP claim.');
}
