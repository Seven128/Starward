// Review-only entry points. They invoke the same visible controls as normal use.
const state=new URLSearchParams(location.search).get('review');
const chapter=new URLSearchParams(location.search).get('chapter');
if(chapter){const go=()=>document.querySelectorAll('#section-nav>div')[chapter==='terrain'?1:2]?.click();if(document.body.dataset.candidateReady)go();else{const ready=new MutationObserver(()=>{if(document.body.dataset.candidateReady){ready.disconnect();go();}});ready.observe(document.body,{attributes:true,attributeFilter:['data-candidate-ready']});}}
function when(selector,action){const use=()=>{const el=document.querySelector(selector);if(!el)return false;action(el);return true;};if(use())return;const o=new MutationObserver(()=>{if(use())o.disconnect();});o.observe(document.body,{childList:true,subtree:true,attributes:true});}
if(state==='filter')when('[data-filter-open]',b=>b.click());
if(['events','solar','lunar','meteor'].includes(state))when('#map-events',b=>{b.click();if(state!=='events')when('.event-open',()=>{const name={solar:'查看日环食',lunar:'查看月全食',meteor:'查看象限仪座流星雨'}[state];document.querySelector(`[aria-label="${name}"]`)?.click();});});
if(state==='choose-events')when('#choose-event',b=>b.click());
if(state==='feedback-records')when('#records [data-id]',()=>document.querySelector('[data-group=FEEDBACK]').click());
if(new URLSearchParams(location.search).has('capture')){const style=document.createElement('style');style.textContent='*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}';document.head.append(style);}

if(state==='photos')when('.site-shot',b=>b.click());
