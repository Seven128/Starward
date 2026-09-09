async page=>{
 const base='http://127.0.0.1:5329/docs/design-resources/wechat-miniapp/map/candidates/context-audit-2026-09-09/';await page.goto(base+'review.html');await page.setViewportSize({width:1100,height:980});
 const f=page.frameLocator('#map'),panel=f.frameLocator('#spot-frame'),assert=(v,m)=>{if(!v)throw Error(m)};
 await page.getByRole('button',{name:'我的草稿',exact:true}).click();await panel.getByRole('button',{name:'编辑',exact:true}).click();
 await f.locator('[name=name]').fill('保留这段未保存名称');
 const before=await f.locator('[data-purpose=daytime-map-background]').getAttribute('style');
 await page.getByRole('button',{name:'尝试切换地点',exact:true}).click();await f.getByRole('dialog').waitFor();
 assert(await f.locator('[data-purpose=daytime-map-background]').getAttribute('style')===before,'camera moved before confirmation');
 await page.locator('#map').screenshot({path:'output/playwright/map-confirm.png'});
 await f.getByRole('button',{name:'继续编辑',exact:true}).click();assert(await f.locator('[name=name]').inputValue()==='保留这段未保存名称','cancel erased text');
 assert(await f.locator('#phone').getAttribute('data-surface')==='spot-editor','cancel changed surface');
 await page.getByRole('button',{name:'尝试切换地点',exact:true}).click();await f.getByRole('button',{name:'放弃修改',exact:true}).click();await panel.getByRole('heading',{name:'山脊观星点',exact:true}).waitFor();
 await page.getByRole('button',{name:'审核中提案',exact:true}).click();await panel.getByRole('button',{name:'云观星',exact:true}).waitFor();
 const visible=await panel.locator('#fixed-actions>div>button').evaluateAll(es=>es.filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent.trim()));assert(visible.length===1&&visible[0].includes('云观星'),'pending actions leaked');
 for(const width of [320,375,390,430]){await page.locator('#width').selectOption(String(width));await page.locator('#map').screenshot({path:'output/playwright/map-pending-'+width+'.png'});}
 await panel.getByRole('button',{name:'云观星',exact:true}).click();await f.locator('#sky-review').waitFor();await f.frameLocator('#sky-review').getByText('星湾观星点 · 审核中 · UTC+8',{exact:true}).waitFor();
 await page.getByRole('button',{name:'模拟合并正式点',exact:true}).click();await page.locator('#state').filter({hasText:'publication-1'}).waitFor();
 await f.frameLocator('#sky-review').getByText('星湾观星点 · UTC+8',{exact:true}).waitFor();const receipt=JSON.parse(await page.locator('#state').innerText());assert(receipt.receipt.formalSpotId==='bay','wrong merged identity');
 assert(await f.getByRole('button',{name:'查看星湾观星点，审核中',exact:true}).count()===0,'proposal marker remains');
 await f.frameLocator('#sky-review').getByRole('button',{name:'返回观星点',exact:true}).click();await f.locator('#sky-review').waitFor({state:'detached'});
 await page.locator('#state').filter({hasText:'map-review-return'}).waitFor();assert(JSON.parse(await page.locator('#state').innerText()).id==='bay','sky returned stale proposal');
 await page.getByRole('button',{name:'模拟合并正式点',exact:true}).click();await page.locator('#state').filter({hasText:'publication-1'}).waitFor();const again=JSON.parse(await page.locator('#state').innerText());assert(JSON.stringify(again.history)===JSON.stringify(receipt.history),'history mutated');assert(await f.getByRole('button',{name:'查看星湾观星点',exact:true}).count()===1,'duplicate formal marker');
}
