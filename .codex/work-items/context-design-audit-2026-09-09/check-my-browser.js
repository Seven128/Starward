async (page) => {
 const frame=page.frames().find(f=>f.url().includes('/preview/index.html'));
 const result={widths:[],scenarios:[]};
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 for(const width of [320,375,390,430]){
  await page.getByRole('combobox',{name:'宽度',exact:true}).selectOption(String(width));
  const geometry=await frame.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,rows:[...document.querySelectorAll('.plan-row')].map(e=>e.getBoundingClientRect().height),suv:!!document.querySelector('.plan-suv')}));
  assert(geometry.width===width,'Wrong iframe width');assert(geometry.scroll<=width,'Horizontal overflow');assert(geometry.rows.length===3&&geometry.rows.every(h=>h>=56),'Row clipping or missing rows');assert(geometry.suv,'Missing adopted SUV');
  await page.locator('iframe').screenshot({path:'output/playwright/my-'+width+'.png'});result.widths.push(geometry);
 }
 await frame.getByRole('button',{name:'星湾观星点 进行中 今天 01:30结束',exact:true}).click();
 assert((await page.locator('#intent').innerText()).includes('计划ID：p1'),'Clicked row lost stable plan identity');
 await page.getByRole('combobox',{name:'样例',exact:true}).selectOption('ended');
 await frame.getByRole('button',{name:'草甸观星点 今天 23:00 21小时30分后',exact:true}).waitFor({state:'visible'});
 assert(await frame.locator('.plan-row[data-ongoing=true]').count()===0,'Ended plan remained ongoing');assert(await frame.locator('.plan-row[data-plan-id=p1]').count()===0,'Plan remains at exact end');result.scenarios.push('end boundary removes p1');
 await page.getByRole('combobox',{name:'样例',exact:true}).selectOption('empty');
 await frame.getByText('暂无进行中或即将开始的观星计划',{exact:true}).waitFor({state:'visible'});
 assert(await frame.locator('.plan-row').count()===0,'Empty includes row');assert(await frame.locator('#more-plans').isHidden(),'Unneeded more entry');
 await frame.getByRole('button',{name:'查看全部观星计划',exact:true}).click();assert((await page.locator('#intent').innerText()).includes('历史与远期'),'Empty lost all plans');result.scenarios.push('empty retains all plans');
 await page.getByRole('combobox',{name:'样例',exact:true}).selectOption('loading');await frame.getByText('正在读取观星计划…',{exact:true}).waitFor({state:'visible'});assert(await frame.locator('#plan-card').getAttribute('aria-busy')==='true','Missing busy state');result.scenarios.push('loading separate from empty');
 await page.getByRole('combobox',{name:'样例',exact:true}).selectOption('error');await frame.getByRole('button',{name:'重试',exact:true}).waitFor({state:'visible'});await page.locator('iframe').screenshot({path:'output/playwright/my-error.png'});await frame.getByRole('button',{name:'重试',exact:true}).click();await frame.locator('.plan-row').first().waitFor({state:'visible'});assert(await frame.locator('.plan-row').count()===3,'Retry did not restore');result.scenarios.push('error/retry with retained entry');
 await page.getByRole('combobox',{name:'样例',exact:true}).selectOption('one');await frame.locator('#more-plans').waitFor({state:'hidden'});assert(await frame.locator('.plan-row').count()===1,'Single ongoing count');result.scenarios.push('one ongoing no more');
 await page.getByRole('combobox',{name:'样例',exact:true}).selectOption('long');await frame.getByText('星湾滨海山顶观星平台与东岸步道交汇点',{exact:true}).waitFor({state:'visible'});await page.getByRole('combobox',{name:'宽度',exact:true}).selectOption('320');await page.locator('iframe').screenshot({path:'output/playwright/my-long-320.png'});result.scenarios.push('long name at320');
 await page.getByRole('checkbox',{name:'减少透明度',exact:true}).check();await frame.waitForFunction(()=>document.body.dataset.solid==='true');assert(await frame.locator('#plan-card').evaluate(e=>getComputedStyle(e).backdropFilter)==='none','Solid mode failed');
 await page.emulateMedia({reducedMotion:'reduce'});assert(await frame.locator('#plan-card').evaluate(e=>getComputedStyle(e).transitionDuration)==='0s','Reduced motion transition remains');result.scenarios.push('solid and reduced motion');
 await page.getByRole('checkbox',{name:'减少透明度',exact:true}).uncheck();await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('combobox',{name:'样例',exact:true}).selectOption('normal');await page.getByRole('combobox',{name:'宽度',exact:true}).selectOption('390');
 return result;
}
