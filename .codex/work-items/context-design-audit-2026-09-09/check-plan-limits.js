async page => {
 const f=page.frameLocator('iframe'),assert=(v,m)=>{if(!v)throw Error(m)};
 assert((await f.locator('.period').innerText()).includes('10月10日'),'prior far-save not completed');
 await page.getByRole('button',{name:'编辑',exact:true}).click();await f.getByLabel('备注',{exact:true}).fill('事件往返保留此备注');
 await f.getByRole('button',{name:'选择事件 ›',exact:true}).click();
 await f.locator('[data-event]').first().click();
 const nested=f.frameLocator('#event-frame');await nested.locator('#primary').click();
 await f.getByLabel('备注',{exact:true}).waitFor();assert(await f.getByLabel('备注',{exact:true}).inputValue()==='事件往返保留此备注','event erased draft');
 for(let i=0;i<3;i++)await f.getByRole('button',{name:'＋ 添加提醒',exact:true}).click();
 assert(await f.getByRole('button',{name:'＋ 添加提醒',exact:true}).isDisabled(),'sixth group allowed');
 const group=f.locator('.reminder-edit').first();
 for(let i=2;i<20;i++)await group.getByRole('button',{name:'＋ 添加清单项',exact:true}).click();
 assert(await group.getByRole('button',{name:'＋ 添加清单项',exact:true}).isDisabled(),'21st item allowed');
 await f.getByLabel('提醒 1 清单项 1',{exact:true}).fill('长中文清单：确认相机电池、三脚架和同行人的饮水，出发前再次核对开放信息');
 await page.locator('#width').selectOption('320');await f.locator('#content').evaluate(e=>e.scrollTop=650);
 await page.locator('iframe').screenshot({path:'output/playwright/plan-editor-long-320.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 assert(await f.locator('#content').evaluate(e=>getComputedStyle(e).animationName)==='none','reduced motion ignored');
}
