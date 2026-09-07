// Current design companion; keep image geometry independent of its caption.
const astronomyTitle=document.createElement('h3');astronomyTitle.className='chapter-title';astronomyTitle.id='astronomy-chapter-title';astronomyTitle.textContent='天文';timeline.prepend(astronomyTitle);
astronomy.querySelector('.astronomy-heading h3')?.remove();astronomy.setAttribute('aria-labelledby',astronomyTitle.id);
function positionPhotoCaption(){viewer.style.setProperty('--photo-half',original.clientHeight/2+'px');}
new ResizeObserver(positionPhotoCaption).observe(original);original.addEventListener('load',positionPhotoCaption);positionPhotoCaption();
// Horizontal drag owns this strip after direction lock. A drag is never a gallery tap.
let stripDrag=null,suppressStripClick=false;
strip.setAttribute('aria-label','场地照片，可横向浏览');strip.tabIndex=0;
strip.addEventListener('dragstart',e=>e.preventDefault());
strip.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;suppressStripClick=false;stripDrag={id:e.pointerId,x:e.clientX,y:e.clientY,start:strip.scrollLeft,axis:null};});
strip.addEventListener('pointermove',e=>{const g=stripDrag;if(!g)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>6)g.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(g.axis!=='x')return;strip.setPointerCapture(e.pointerId);suppressStripClick=true;strip.dataset.dragging='true';strip.style.scrollSnapType='none';strip.scrollLeft=g.start-dx;});
function settleStrip(cancel=false){const g=stripDrag;stripDrag=null;strip.dataset.dragging='false';if(g?.axis!=='x')return;const current=cancel?g.start:strip.scrollLeft;strip.style.scrollSnapType='';const max=strip.scrollWidth-strip.clientWidth;const stops=[...strip.children].map(e=>Math.max(0,Math.min(max,e.offsetLeft-12)));const target=stops.sort((a,b)=>Math.abs(a-current)-Math.abs(b-current))[0]||0;strip.scrollTo({left:target,behavior:reduced()?'instant':'smooth'});}
strip.addEventListener('pointerup',()=>settleStrip());strip.addEventListener('pointercancel',()=>settleStrip(true));
strip.addEventListener('click',e=>{if(suppressStripClick){e.preventDefault();e.stopImmediatePropagation();}},true);
strip.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const max=strip.scrollWidth-strip.clientWidth;strip.scrollTo({left:e.key==='Home'?0:e.key==='End'?max:clamp(strip.scrollLeft+(e.key==='ArrowRight'?1:-1)*(strip.children[0]?.offsetWidth+8||0),0,max),behavior:reduced()?'instant':'smooth'});});
paint(height);trackChapter();
