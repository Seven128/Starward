from pathlib import Path
import re
root=Path('docs/design-resources/wechat-miniapp')
shared=root/'shared'; fluid=shared/'fluid-motion-2026-09-22'; candidate=shared/'comfortable-scale-2026-09-22/preview'
prefix='/docs/design-resources/wechat-miniapp/shared/fluid-motion-2026-09-22/'
def write(path,text): path.write_text(text,encoding='utf-8')

# Candidate ruler has one implementation, reached by all current consumers.
s=(shared/'observation-time/control.js').read_text(encoding='utf-8')
s=s.replace("let presented = index, motionFrame = 0;", "let presented = index, motionFrame = 0, committedIndex=index; const F=StarwardFluid; let settlement=null;")
start=s.index('      function stopMotion()'); end=s.index('      function calendarMonth()',start)
s=s[:start]+'''      const movement=F.scalar(index*66,v=>paint(v/66));
      function stopMotion(){movement.stop();settlement=null;root.dataset.settling='false';}
      function settle(target,velocity=0,commit=false){
        stopMotion();root.dataset.settling='true';settlement=commit?target:null;
        movement.to(target*66,{velocity,bouncy:false,done(){root.dataset.settling='false';if(commit){selectedIndex=target;committedIndex=target;settlement=null;render();onChange(state(),'commit');root.dataset.commitCount=String(Number(root.dataset.commitCount||0)+1);}}});
      }
''' +s[end:]
s=s.replace("function setIndex(i, phase) { selectedIndex = clamp(i); render(); onChange(state(), phase); if (phase !== 'preview') settle(selectedIndex); }", "function setIndex(i, phase) { selectedIndex = clamp(i); render(); if(phase==='commit'){settle(selectedIndex,0,true);}else{onChange(state(),phase);if(phase==='cancel')settle(selectedIndex);} }")
start=s.index('      function cancel()');end=s.index('      function chooseDay',start)
s=s[:start]+'''      function cancel() { const pending=!!drag||movement.active;drag=null;stopMotion();selectedIndex=committedIndex;render();movement.set(selectedIndex*66);if(pending)onChange(state(),'cancel'); }
''' +s[end:]
s=s.replace("render(); paint(selectedIndex); onChange(state(), 'commit');", "committedIndex=selectedIndex;render();movement.set(selectedIndex*66);onChange(state(),'commit');")
s=s.replace("origin:presented, axis:null, progress:presented", "origin:F.unRubber(presented*66,0,clamp(Infinity)*66,32)/66, axis:null, progress:presented, samples:[{v:-e.clientX,t:e.timeStamp}]")
s=s.replace("drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';", "drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';")
s=s.replace("drag.progress = clamp(drag.origin - dx / 66);", "drag.raw=(drag.origin*66-dx);drag.progress=F.rubber(drag.raw,0,clamp(Infinity)*66,32)/66;drag.samples.push({v:-e.clientX,t:e.timeStamp});drag.samples=drag.samples.slice(-24);")
s=s.replace("setIndex(Math.round(drag.progress), 'preview'); paint(drag.progress);", "setIndex(Math.round(drag.progress), 'preview'); movement.set(drag.progress*66);root.dataset.motion='dragging';")
s=s.replace("listen(ruler, 'pointerup', () => { const ended = drag; drag = null; if (ended?.axis === 'x') setIndex(Math.round(ended.progress), 'commit'); else if (ended) settle(selectedIndex); });", "listen(ruler, 'pointerup', e => { const ended=drag;drag=null;root.dataset.motion='idle';if(ended?.axis==='x'){const v=reducedMotion.matches?0:F.velocity(ended.samples,e.timeStamp);const target=F.projected(ended.progress,v/66,0,clamp(Infinity),150);selectedIndex=target;render();settle(target,v*F.resistance(ended.raw,0,clamp(Infinity)*66,32),true);}else if(ended)settle(committedIndex); });")
s=s.replace("stopMotion(); paint(selectedIndex);", "stopMotion(); movement.set(committedIndex*66);")
s=s.replace("render(); paint(selectedIndex);\n      return", "render();movement.set(selectedIndex*66);\n      return")
write(fluid/'observation-time.js',s)

# The shared gallery still owns both site/facility subjects; consumers supply the spot context.
s=(root/'map/adopted/spot-information/preview/gestures.js').read_text(encoding='utf-8')
a=s.index('// Disclosure height');b=s.index('// All albums',a);s=s[:a]+s[b:]
s=s.replace("function closeGallery(){if(!viewer.open||closing)return;closing=true;", "function closeGallery(){if(!viewer.open||closing)return;imageMotion.stop();closing=true;")
s=s.replace("function stepPhoto(delta){", "let pagingDirection=0;function stepPhoto(delta){")
s=s.replace("photoIndex=next;displayPhoto();", "photoIndex=next;pagingDirection=delta;displayPhoto();")
s=s.replace("if(animateOpen)photoMotion", "imageMotion.reset();if(animateOpen)photoMotion")
s=s.replace("caption.style.opacity='';setPhotoChrome(false);}", "caption.style.opacity='';setPhotoChrome(false);if(pagingDirection){imageMotion.enter(pagingDirection);pagingDirection=0;}}")
start=s.index("original.addEventListener('dragstart'");end=s.index('paint(height);',start)
s=s[:start]+'''const imageMotion=StarwardFluid.mountImage(original,{viewer,canStep:d=>photoIndex+d>=0&&photoIndex+d<album.length,onStep:stepPhoto,onClose:requestPhotoClose,chrome:setPhotoChrome,isBusy:()=>closing||viewer.dataset.motion==='loading',beforeGrab(){
  let live=null;if(viewer.dataset.motion==='opening'){const f=boxOf(flight),r=boxOf(original);live={x:f.x+f.w/2-r.x-r.w/2,y:f.y+f.h/2-r.y-r.h/2,scale:f.w/r.w};}
  cancelAnimationFrame(flightFrame);viewer.dataset.motion='open';return live;
}});
viewer.addEventListener('close',()=>imageMotion.reset());
viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stepPhoto(e.key==='ArrowRight'?1:-1);}});
''' +s[end:]
write(fluid/'spot-gallery.js',s)

# Mode state remains in the existing settings owner; shared motion gets callbacks only.
s=(root/'settings/adopted/settings-page/preview/app.mjs').read_text(encoding='utf-8')
s=s.replace("from './icons.mjs'", "from '/docs/design-resources/wechat-miniapp/settings/adopted/settings-page/preview/icons.mjs'")
s=s.replace("from './mode-core.mjs'", "from '/docs/design-resources/wechat-miniapp/settings/adopted/settings-page/preview/mode-core.mjs'")
s=s.replace("$('.mode-thumb').style.transform=`translateX(${DISPLAY_MODES.indexOf(m)*100}%)`;", "if(modeMotion)modeMotion.to(DISPLAY_MODES.indexOf(m));")
s=s.replace("DISPLAY_MODES.forEach((m,i)=>", "let modeMotion=null;DISPLAY_MODES.forEach((m,i)=>")
a=s.index('track.onpointerdown');b=s.index('track.onkeydown',a)
s=s[:a]+"modeMotion=StarwardFluid.mountMode(track,{getIndex:()=>DISPLAY_MODES.indexOf(mode),onCommit:i=>setMode(DISPLAY_MODES[i])});\n"+s[b:]
write(candidate/'settings-app.mjs',s)

# Load common mechanics once, ahead of consumers. Legacy adopted pages remain unchanged.
for p in candidate.glob('*.html'):
 s=p.read_text(encoding='utf-8')
 tags=''.join('<script src="'+prefix+f+'?v=1"></script>' for f in ['core.js','mode.js','image-motion.js'])
 s=s.replace('</head>',tags+'<link rel="stylesheet" href="'+prefix+'motion.css?v=1"></head>')
 s=re.sub(r'<script src="[^"]*shared/observation-time/control.js[^\"]*"></script>', '<script src="'+prefix+'observation-time.js?v=1"></script>',s)
 if p.name=='map-panel.html':s=s.replace('<script src="gestures.js?v=1788812229987"></script>', '<script src="'+prefix+'spot-gallery.js?v=1"></script>')
 if p.name=='settings.html':s=s.replace('src="app.mjs"','src="/docs/design-resources/wechat-miniapp/shared/comfortable-scale-2026-09-22/preview/settings-app.mjs?v=1"')
 s=s.replace('</body>','<script type="module" src="'+prefix+'surfaces.mjs?v=1"></script></body>')
 write(p,s)
p=shared/'journey-sharing-2026-09-22/index.html';s=p.read_text(encoding='utf-8');s=s.replace('</head>','<script src="'+prefix+'core.js?v=1"></script><link rel="stylesheet" href="'+prefix+'motion.css?v=1"></head>');s=s.replace('</body>','<script type="module" src="'+prefix+'surfaces.mjs?v=1"></script></body>');write(p,s)
