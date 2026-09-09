async page => {
 const base='http://127.0.0.1:5329/docs/design-resources/wechat-miniapp/plan/candidates/context-audit-2026-09-09/';
 const assert=(v,m)=>{if(!v)throw Error(m)}; const results=[];
 await page.setViewportSize({width:1100,height:980});await page.goto(base+'review.html');
 const f=page.frameLocator('iframe');
 await f.getByRole('button',{name:'编辑计划',exact:true}).waitFor();
 for(const width of [320,375,390,430]){
  await page.locator('#width').selectOption(String(width));
  const geo=await f.locator('body').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
  assert(geo.width===width&&geo.scroll===width,'width/overflow '+width);
  await f.locator('#content').evaluate(e=>e.scrollTop=400);
  await page.locator('iframe').screenshot({path:'output/playwright/plan-detail-'+width+'.png'});
  results.push({width,geo});
 }
 await page.locator('#quality').selectOption('unknown');
 await f.getByText('路线暂未获取，暂无法核对到达时间',{exact:true}).waitFor();
 assert(await f.getByText('预计晚于观测开始 40 分钟',{exact:true}).count()===0,'stale conflict retained');
 await page.locator('#quality').selectOption('stale');await f.getByText('路线估计已过期，暂无法核对到达时间',{exact:true}).waitFor();
 await page.locator('#delivery').selectOption('unknown');await f.getByRole('button',{name:'结果待确认',exact:true}).click();
 assert((await f.locator('dialog p').innerText()).includes('不盲目重复发送'),'unknown retry advice');await f.getByRole('button',{name:'知道了',exact:true}).click();
 const check=f.getByRole('checkbox').first();await check.click();assert(await check.getAttribute('aria-checked')==='true','check disabled by unknown delivery');
 await page.locator('#quality').selectOption('ready');
 await f.getByRole('button',{name:'编辑计划',exact:true}).click();
 await f.getByLabel('出发时间',{exact:true}).fill('2026-09-10T19:00');
 await f.getByText('预计晚于观测开始 40 分钟',{exact:true}).waitFor();
 await f.getByRole('button',{name:'保存计划',exact:true}).click();await f.getByRole('button',{name:'编辑计划',exact:true}).waitFor();
 assert((await f.locator('.period').innerText()).includes('20:30'),'save auto changed start');
 await f.getByText('预计晚于观测开始 40 分钟',{exact:true}).waitFor();
 assert(await f.getByRole('button',{name:'等待重新排期',exact:true}).count()===2,'modified reminder did not reschedule');
 await f.getByRole('button',{name:'编辑计划',exact:true}).click();await f.getByLabel('出发时间',{exact:true}).fill('2026-09-10T18:00');
 await f.getByText('预计可在观测开始前到达',{exact:true}).waitFor();
 await f.getByLabel('备注',{exact:true}).fill('未保存的备注');
 page.once('dialog',d=>d.dismiss());await f.getByRole('button',{name:'取消',exact:true}).click();
 assert(await f.getByLabel('备注',{exact:true}).inputValue()==='未保存的备注','cancel discard lost draft');
 page.once('dialog',d=>d.accept());await f.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'远期无天气',exact:true}).click();await f.getByRole('button',{name:'保存计划',exact:true}).waitFor();
 assert((await f.getByLabel('开始观测',{exact:true}).inputValue()).startsWith('2026-10-10'),'far date missing');
 await f.getByText('天气暂未覆盖，仍可保存计划。',{exact:true}).waitFor();
 await f.getByRole('button',{name:'保存计划',exact:true}).click();await f.getByRole('button',{name:'编辑计划',exact:true}).waitFor();
 assert((await f.locator('.period').innerText()).includes('10月10日'),'far save failed');
 results.push('unknown/stale route, checklist independence, late save, departure correction, discard cancellation, far save passed');
 return results;
}
