// Material substitution only. Existing buttons, semantic state and animation owners remain.
(async()=>{
 const {replaceGraphic,applyTimeIcons,matteImage}=await import('/docs/design-resources/wechat-miniapp/shared/icons/material-preview.mjs');
 applyTimeIcons(document);
 replaceGraphic(document,'.search-entry svg','search');
 replaceGraphic(document,'.map-tool[aria-label="当前位置"] svg','location',{size:20});
 replaceGraphic(document,'.map-tool[aria-label="图层"] svg','layers',{size:20});
 const referencePin=document.querySelector('#map-reference svg.text-amber-300');if(referencePin){const wrapper=referencePin.parentElement;wrapper.style.cssText='width:32px;height:32px;background:transparent;box-shadow:none;border-radius:0';if(wrapper.nextElementSibling)wrapper.nextElementSibling.hidden=true;referencePin.replaceWith(matteImage('spot-marker',{size:32}));}
 replaceGraphic(document,'.photo-count svg','images',{size:12});
 for(const [selector,name] of [['.evidence-group[aria-label="云层"] h4 svg','cloud'],['.evidence-group[aria-label="温湿"] h4 svg','temperature'],['.evidence-group[aria-label="风与能见度"] h4 svg','wind'],['.evidence-group[aria-label="降水"] h4 svg','droplet'],['.evidence-group[aria-label="月亮与夜间"] h4 svg','moon'],['.night-light svg','bulb'],['.targets h3 svg','telescope'],['.hours-row svg','clock']])replaceGraphic(document,selector,name);
 document.querySelector('#photo-close')?.replaceChildren(matteImage('close'));
 document.querySelector('body>footer')?.querySelectorAll('button').forEach((b,i)=>replaceGraphic(b,'svg',i?'account-user':'map',{state:i?'default':'selected',size:20}));

 const root='/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/assets/';
 const src=(name,state='default')=>root+name+'--day--'+state+'.png';
 const replace=(selector,name)=>document.querySelectorAll(selector).forEach(old=>{const img=document.createElement('img');img.src=src(name);img.alt='';img.className=(old.getAttribute('class')||'')+' matte-control-icon';img.style.width=(old.getAttribute('width')||18)+'px';img.style.height=(old.getAttribute('height')||18)+'px';old.replaceWith(img);});
 replace('.navigation-icon svg','navigation');replace('[data-photo=parking] .facility-title svg','parking');replace('[data-photo=toilet] .facility-title svg','restroom');replace('[data-target=sky] svg','telescope');replace('#share svg,#fixed-actions button:not([id]) svg','share');
 // The existing rotor still performs one turn; independent satellites keep their timelines.
 const rotor=document.querySelector('#favorite-rotor');if(rotor){const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('x','-10');image.setAttribute('y','-10');image.setAttribute('width','20');image.setAttribute('height','20');rotor.replaceChildren(image);const button=document.querySelector('#favorite');const sync=()=>image.setAttribute('href',src('favorite-star',button.getAttribute('aria-pressed')==='true'?'selected':'default'));sync();new MutationObserver(sync).observe(button,{attributes:true,attributeFilter:['aria-pressed']});}
// Procedural trails and motion remain with the existing favorite owner.
 document.querySelectorAll('.minor-meteor g').forEach(g=>{const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',src('favorite-satellite'));image.setAttribute('width','20');image.setAttribute('height','20');g.replaceChildren(image);});
})();
