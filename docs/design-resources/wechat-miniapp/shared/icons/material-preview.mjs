// Opt-in material adapter for the current Map/Plan review; data glyphs remain untouched.
const assets=new URL('./adopted/b-matte-256/assets/',import.meta.url);
export function matteImage(name,{size=18,state='default',flip=false,document:doc=window.document}={}){
  const img=doc.createElement('img');img.src=new URL(`${name}--day--${state}.png`,assets);img.alt='';img.dataset.matteIcon=name;img.className='matte-control-icon';
  img.style.cssText=`width:${size}px;height:${size}px;object-fit:contain;flex-shrink:0;vertical-align:middle;${flip?'transform:rotate(180deg);':''}`;return img;
}
export function replaceGraphic(root,selector,name,options={}){root.querySelectorAll(selector).forEach(old=>{const img=matteImage(name,{...options,document:old.ownerDocument});img.className+=' '+(old.getAttribute('class')||'');old.replaceWith(img);});}
export function applyTimeIcons(root){
  replaceGraphic(root,'.observation-time #date-open svg','calendar');
  for(const [selector,name,flip] of [['.observation-time #date-prev','chevron-right',true],['.observation-time #date-next','chevron-right',false],['.observation-calendar #calendar-close','close',false]])root.querySelectorAll(selector).forEach(button=>{if(!button.querySelector('[data-matte-icon]'))button.replaceChildren(matteImage(name,{size:16,flip,document:button.ownerDocument}));});
}
