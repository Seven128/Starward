
const card=document.querySelector('#plan-card'),light=document.createElement('span');light.className='glass-touch';light.ariaHidden='true';card.append(light);
card.addEventListener('pointerdown',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--touch-x',((e.clientX-r.left)/r.width*100)+'%');card.style.setProperty('--touch-y',((e.clientY-r.top)/r.height*100)+'%');card.dataset.touch='true';});
for(const event of ['pointerup','pointercancel','pointerleave'])card.addEventListener(event,()=>card.dataset.touch='false');
addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='glass-material')document.body.dataset.solid=String(!!e.data.solid);});
