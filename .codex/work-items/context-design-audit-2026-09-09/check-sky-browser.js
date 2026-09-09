async page=>{
 await page.setViewportSize({width:1100,height:980});await page.reload();const f=page.frameLocator('iframe'),assert=(v,m)=>{if(!v)throw Error(m)};
 await f.locator('.target').first().waitFor();
 for(const width of [320,375,390,430]){await page.locator('#width').selectOption(String(width));const g=await f.locator('#phone').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert(g.width===width&&g.scroll===width,'width overflow');await page.locator('iframe').screenshot({path:'output/playwright/sky-'+width+'.png'});}
 await page.locator('#width').selectOption('320');await page.locator('#long').check();
 const g=await f.locator('#selected-place').evaluate(e=>({p:e.getBoundingClientRect().toJSON(),date:document.querySelector('#date-open').getBoundingClientRect().toJSON()}));assert(g.p.bottom<=g.date.top,'place overlaps date');await page.locator('iframe').screenshot({path:'output/playwright/sky-long-320.png'});
 await page.getByRole('button',{name:'方向暂停',exact:true}).click();await f.getByText('方向信号已暂停',{exact:true}).waitFor();assert(await f.locator('#selected-place').isVisible(),'lost selected location in recovery');
 await page.getByRole('button',{name:'星空失败',exact:true}).click();await f.getByText('星空数据暂不可用',{exact:true}).waitFor();assert(await f.locator('#date-open').isVisible(),'lost time in failure');
 await page.getByRole('button',{name:'织女星视野',exact:true}).click();await f.locator('.target').first().waitFor();
 await page.getByRole('button',{name:'观测红光',exact:true}).click();await f.locator('body.red').waitFor();
 await page.locator('iframe').screenshot({path:'output/playwright/sky-red-320.png'});
 await page.getByRole('button',{name:'天体列表',exact:true}).click();await f.getByRole('heading',{name:'所选时刻的天体',exact:true}).waitFor();await f.getByRole('button',{name:'关闭',exact:true}).click();
 await f.getByRole('button',{name:'返回观星点',exact:true}).click();await page.getByText('已返回选定地点：星湾观星点（本审查记录返回意图）',{exact:true}).waitFor();
}
