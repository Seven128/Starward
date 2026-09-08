const doc=document.querySelector('.form-scroll'),nav=document.querySelector('.chapter-nav'),buttons=[...nav.querySelectorAll('button')],sections=buttons.map(b=>document.querySelector('#chapter-'+b.dataset.chapter));
let frame=0,target=null;
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
function offset(section){return section.getBoundingClientRect().top-doc.getBoundingClientRect().top+doc.scrollTop-12;}
function paint(i){buttons.forEach((b,j)=>b.setAttribute('aria-current',i===j?'location':'false'));nav.querySelector('i').style.transform=`translateX(${buttons[i].offsetLeft-16+(buttons[i].offsetWidth-20)/2}px)`;}
function track(){let i=0;sections.forEach((s,j)=>{if(doc.scrollTop>=offset(s)-25)i=j;});if(doc.scrollHeight-doc.scrollTop-doc.clientHeight<3)i=sections.length-1;paint(target??i);}
function stop(){cancelAnimationFrame(frame);target=null;track();}
buttons.forEach((b,i)=>b.onclick=()=>{cancelAnimationFrame(frame);target=i;paint(i);const start=doc.scrollTop,end=i?Math.max(0,Math.min(offset(sections[i]),doc.scrollHeight-doc.clientHeight)):0,time=performance.now(),duration=reduced()?0:320;function move(now){const t=duration?Math.min(1,(now-time)/duration):1;doc.scrollTop=start+(end-start)*(1-(1-t)**3);if(t<1)frame=requestAnimationFrame(move);else{target=null;track();const heading=sections[i].querySelector('h3')||sections[i];heading.tabIndex=-1;heading.focus({preventScroll:true});}}frame=requestAnimationFrame(move);});
doc.addEventListener('scroll',track,{passive:true});doc.addEventListener('pointerdown',stop,{passive:true});doc.addEventListener('wheel',stop,{passive:true});doc.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))stop();});window.addEventListener('resize',track);track();
// Overlay thumb consumes no text-column width and leaves native text scrolling intact.
const notes=document.querySelector('textarea[name=detail]'),wrap=document.createElement('div'),thumb=document.createElement('i');
wrap.className='notes-scroll';thumb.className='notes-thumb';thumb.setAttribute('aria-hidden','true');notes.before(wrap);wrap.append(notes,thumb);
function paintThumb(){const overflow=notes.scrollHeight-notes.clientHeight;thumb.hidden=overflow<2;if(overflow<2)return;const available=notes.clientHeight-10,height=Math.max(16,available*notes.clientHeight/notes.scrollHeight);thumb.style.height=height+'px';thumb.style.top=(5+(available-height)*notes.scrollTop/overflow)+'px';}
notes.addEventListener('input',paintThumb);notes.addEventListener('scroll',paintThumb,{passive:true});new ResizeObserver(paintThumb).observe(notes);paintThumb();
