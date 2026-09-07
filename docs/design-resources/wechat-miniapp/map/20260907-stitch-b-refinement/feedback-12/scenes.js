// Decorative action scenes share no domain/weather state.
const favoriteButton=document.querySelector('#favorite');
const actionButtons=[...document.querySelectorAll('#fixed-actions button')];
const shareButton=actionButtons[1],cloudButton=document.querySelector('#cloud-action');
function nightScene(points){const s=document.createElement('span');s.className='scene-night';for(const [i,p] of points.entries()){const star=document.createElement('i');star.className='sky-spark';star.style.cssText='left:'+p[0]+'%;top:'+p[1]+'%;--period:'+(2.7+i*.27)+'s;--delay:'+(-i*.53)+'s;--size:'+(i%3===0?1.6:1.1)+'px';s.append(star);}return s;}
function sceneLayer(button){const layer=document.createElement('span');layer.className='action-scene';layer.setAttribute('aria-hidden','true');button.prepend(layer);return layer;}
const favoriteScene=sceneLayer(favoriteButton),dayScene=document.createElement('span');dayScene.className='scene-day';dayScene.innerHTML='<i class="soft-cloud cloud-one"></i><i class="soft-cloud cloud-two"></i>';favoriteScene.append(dayScene,nightScene([[9,20],[27,75],[44,16],[60,83],[76,25],[90,68],[18,49],[91,10]]));
sceneLayer(cloudButton).append(nightScene([[13,76],[30,20],[48,79],[66,15],[82,65],[94,30],[9,36],[72,86]]));
shareButton.classList.add('share-scene');
for(const button of actionButtons){for(const child of button.children)if(!child.classList.contains('action-scene'))child.classList.add('action-foreground');}
const favoriteLabel=favoriteButton.querySelector(':scope > span:last-child');favoriteLabel.classList.add('favorite-label');
let sceneProgress=0,sceneFrame=0;
function paintScene(p){sceneProgress=p;favoriteScene.style.setProperty('--scene-progress',String(p));favoriteButton.dataset.nightReady=String(p>=.999&&favoriteButton.getAttribute('aria-pressed')==='true');favoriteButton.dataset.nightContrast=String(p>.48);}
function syncScene(){cancelAnimationFrame(sceneFrame);const target=favoriteButton.getAttribute('aria-pressed')==='true'?1:0,from=sceneProgress,started=performance.now(),duration=reduced()?0:360*Math.abs(target-from);favoriteButton.dataset.nightReady='false';function tick(now){const t=duration?Math.min(1,(now-started)/duration):1;paintScene(from+(target-from)*(t*t*(3-2*t)));if(t<1)sceneFrame=requestAnimationFrame(tick);}sceneFrame=requestAnimationFrame(tick);}
new MutationObserver(syncScene).observe(favoriteButton,{attributes:true,attributeFilter:['aria-pressed']});
let sceneOwnerVisible=true;function pauseScene(){document.body.dataset.scenePaused=String(document.hidden||!sceneOwnerVisible);}new IntersectionObserver(entries=>{sceneOwnerVisible=entries.some(e=>e.isIntersecting);pauseScene();}).observe(document.querySelector('#fixed-actions'));document.addEventListener('visibilitychange',pauseScene);pauseScene();paintScene(favoriteButton.getAttribute('aria-pressed')==='true'?1:0);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncScene);
