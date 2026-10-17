import {sceneId,status,dialog,loader,navigateScene} from '../comfortable-scale-2026-09-22/preview/scene-ui.mjs';
import {disclosure,sourceCard} from '../comfortable-scale-2026-09-22/preview/source-ui.mjs?v=20261015-scenes';
import {facilityCardMarkup,adoptFacilityCards,facilities} from '../comfortable-scale-2026-09-22/preview/facility-card.mjs?v=20261015-final';
const id=sceneId||new URLSearchParams(location.search).get('scene')||'12D-ready',$=s=>document.querySelector(s),main=$('#content');
const normalArticle=['12E-ready','12E','12E-failed','12E-reference'].includes(id),source=id.startsWith('12F'),field=id==='12D-field-ready';
const identity='<section class="identity"><h2>星湾观星点</h2><p>滨海 · 东岸 · 地点资料示意</p></section>';
const image='<figure class="illustration"><img src="/docs/design-resources/wechat-miniapp/map/adopted/spot-information/preview/site-illustration.jpg" alt="海岸观测建筑设计插画，不是本观星点实拍"><figcaption>Starward · 设计插画 · 不证明本点现场</figcaption></figure>';
const readingSource=()=>disclosure(['reading-text','reading-illustration'],'资料来源与核验');
const facility=key=>`<div class="facility-stack">${facilityCardMarkup(key)}</div>`;
const button=(text,to)=>{const b=document.createElement('button');b.type='button';b.className='reading-button';b.textContent=text;b.onclick=()=>navigateScene(to);return b;};
$('#title').textContent=source?'来源与更新时间':field||id==='12D-field'?'场地资料':normalArticle?'攻略文章':id==='12D-article'||id==='12E-request-failed'?'攻略文章':id==='12D-invalid'?'观星点资料':'观星攻略';$('#back').onclick=()=>navigateScene(normalArticle?'12D-ready':'09E');
if(id==='12D-ready'){
 main.innerHTML=identity+`<section class="card">${image}<h2>到达与夜间步道</h2><p>从停车入口到观测区域，查看夜间步道、设施与进入条件。</p><p class="meta">官方 · Starward设计示例<br>更新2026-09-06 · 已核验（示意）</p><div id="guide-action"></div></section>`;$('#guide-action').append(button('阅读攻略','12E-ready'));
}else if(field){
 main.innerHTML=identity+`<section class="card"><h2>到达与夜间安全</h2><div class="field-facts"><p><small>直线距离</small>24.6 km</p><p><small>末段道路</small>步道约200米</p><p><small>开放时间</small>18:00–次日06:00</p><p><small>进入条件</small>需预约进入</p></div><p class="meta">直线距离不代表实际道路里程。</p><div class="warning">夜间台阶段需自备照明，不越过封闭围栏。</div><button class="reading-button" id="navigate">去这里</button></section><section class="card"><h2>设施与现场</h2>${facility('parking')}${facility('toilet')}<div class="facility-detail"><dl><div><dt>停车条件</dt><dd>预约入场 · 不占用消防通道</dd></div><div><dt>洗手间时段</dt><dd>来源未提供</dd></div></dl><p class="meta">场地管理方 · 核验2026-09-06（示意）</p></div></section><section class="card">${readingSource()}</section>`;
 $('#navigate').onclick=()=>{const sheet=dialog('查看导航位置','<p>东岸路观景步道入口 · 直线距离24.6km</p><p>实际路线与行驶距离由地图应用提供。</p><footer><button data-cancel>取消</button><button data-confirm>打开地图应用</button></footer>');sheet.querySelector('[data-cancel]').onclick=()=>sheet.close();sheet.querySelector('[data-confirm]').onclick=()=>{sheet.close();};};$('#actions').append(button('反馈现场情况','14E'));
}else if(normalArticle){
 const media=id==='12E'?'<div class="photo-state" id="photo-state"></div>':id==='12E-failed'?'<div class="photo-state" id="photo-state">照片暂时无法显示</div>':image;
 main.innerHTML=`<article class="article"><p class="meta">星湾观星点 · 滨海东岸</p><h1>到达与夜间步道</h1><p class="meta">官方 · Starward设计示例<br>发布2026-09-05 · 更新2026-09-06<br>已核验（示意）</p><p>从东岸路入口到达后，可在东侧停车区域停留。前往观测区域还需沿步道行走约200米，留意现场路标和开放公告。</p><section class="warning"><h2>夜间步道提示</h2><p>照明较弱，台阶段需自备照明。不越过封闭围栏，不在水边架设器材。</p></section>${media}<p>停车与洗手间各有独立开放时段和使用条件。以下停车资料来自同一地点的设施记录，正文不替代最新现场公告。</p><div id="article-facility">${id==='12E-reference'?'':facility('parking')}</div><p>离开时沿原步道返回停车区域，整理器材与随身垃圾。预约和夜间出场事宜应在出发前向管理方核实。</p>${readingSource()}</article>`;
 if(id==='12E')$('#photo-state').append(status('正在加载照片','','','loading'));if(id==='12E-failed')$('#photo-state').append(button('重试照片','12E-ready'));if(id==='12E-reference')$('#article-facility').append(status('停车资料尚未确认最新状态','重新获取',()=>navigateScene('12E-ready'),'warning'));$('#actions').append(button('返回本地点攻略','12D-ready'));
}else if(source){
 if(id==='12F-loading')main.append(status('正在读取来源','','','loading'));
 else if(id==='12F-failed')main.append(status('来源暂未取得','重试',()=>navigateScene('12F-loading'),'error'));
 else {main.innerHTML=['weather','air','recent','terrain','nightlight','engine','warning'].filter(key=>id!=='12F-partial'||key!=='terrain').map(sourceCard).join('');if(id==='12F-partial')main.prepend(status('地形来源暂未取得；其余来源保留','重试',()=>navigateScene('12F'),'warning'));}$('#actions').append(button('返回观星点','09E'));
}else {
 const loading=id==='12D-loading',failed=['12D-failed','12E-request-failed'].includes(id),invalid=id==='12D-invalid',missing=id==='12D-article';
 main.innerHTML=invalid?'':identity;main.append(status(loading?'正在读取攻略资料':failed?'资料暂未取得':invalid?'观星点身份无法确认':missing?'这篇文章已不可用':id==='12D-field'?'暂无场地资料':'暂无观星攻略',failed?'重试':loading?'':invalid?'返回地图':missing?'返回攻略列表':'返回观星点',()=>navigateScene(failed?(id==='12E-request-failed'?'12E-ready':'12D-ready'):invalid?'11A':missing?'12D-ready':'09E'),loading?'loading':failed?'error':'info'));
}
adoptFacilityCards(main);
main.querySelectorAll('[data-facility-component]').forEach(b=>b.onclick=()=>{
 const frame=document.createElement('iframe');frame.className='reading-gallery-frame';frame.title='设施图片 · 原共享查看器';frame.style.visibility='hidden';frame.src='/docs/design-resources/wechat-miniapp/shared/comfortable-scale-2026-09-22/preview/map-panel.html?extent=large&media=1';
 frame.onload=()=>{const viewer=frame.contentDocument.querySelector('#photo-viewer'),box=()=>{if(!b.isConnected)return null;const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};viewer.addEventListener('close',()=>{frame.remove();b.focus({preventScroll:true});},{once:true});frame.contentWindow.StarwardSpotGallery.openFacility(b.dataset.facilityComponent,{startBox:box(),returnBox:box});frame.style.visibility='visible';};$('#phone').append(frame);
});
document.body.dataset.sceneReady='true';
