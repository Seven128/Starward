import automator from 'miniprogram-automator';
let p;const timer=setTimeout(()=>{console.error('section_tap_timeout');process.exit(2)},15000);
try {p=await automator.connect({wsEndpoint:'ws://127.0.0.1:9421'});const page=await p.currentPage();console.log({path:page.path});const tab=await page.$('.spot-panel__section-tab[data-section="spot-panel-astronomy"]');if(!tab)throw Error('section_missing');await tab.tap();console.log('tap dispatched');}finally{clearTimeout(timer);p?.disconnect();}
