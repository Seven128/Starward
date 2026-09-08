
const card=document.querySelector('#plan-card'),light=document.createElement('span');light.className='glass-touch';light.ariaHidden='true';card.append(light);
card.addEventListener('pointerdown',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--touch-x',((e.clientX-r.left)/r.width*100)+'%');card.style.setProperty('--touch-y',((e.clientY-r.top)/r.height*100)+'%');card.dataset.touch='true';});
for(const event of ['pointerup','pointercancel','pointerleave'])card.addEventListener(event,()=>card.dataset.touch='false');
card.addEventListener('click',e=>{const row=e.target.closest('.plan-row');const all=e.target.closest('#all-plans,#more-plans');if(!row&&!all)return;e.preventDefault();e.stopImmediatePropagation();const index=[...document.querySelectorAll('.plan-row')].indexOf(row);location.href='/plan/adopted/plan-page/index.html?from=my'+(row?'&id=p'+(index+1):'');},{capture:true});
addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='glass-material')document.body.dataset.solid=String(!!e.data.solid);});
