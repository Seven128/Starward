import {sceneId,status,dialog,loader,notice,navigateScene} from './scene-ui.mjs';
const $=s=>document.querySelector(s);
export async function applyScene(surface){
 if(surface==='feedback')return;
 if(surface==='my')myScenes();
 if(surface==='search')searchScenes();
 // Map/editor and Plan states are mounted by their existing state owners.
 document.body.dataset.sceneReady='true';
}
function myScenes(){
 const id=sceneId,guest=!id.startsWith('10S'),list=$('#plan-list'),name=$('#display-name');
 document.body.dataset.sceneGuest=String(guest);if(guest)document.addEventListener('design-login-request',()=>openLogin());
 if(guest){name.textContent='微信快捷登录';$('#nickname').setAttribute('aria-label','微信快捷登录');list.replaceChildren(status('登录后查看观星计划','登录',()=>openLogin()));$('#all-plans').hidden=true;$('#more-plans').hidden=true;$('#avatar').onclick=()=>openLogin();$('#nickname').onclick=()=>openLogin();}
 if(id==='10S-loading'||id==='10S-failed'){list.replaceChildren(status(id.endsWith('loading')?'正在同步账户':'账户资料暂未取得',id.endsWith('failed')?'重试':'',()=>navigateScene('10S-loading'),id.endsWith('loading')?'loading':'error'));$('#all-plans').disabled=true;$('#more-plans').hidden=true;}
 if(id==='10S-stale')list.prepend(status('更新失败，保留上次记录','重试',()=>navigateScene('10S'),'warning'));
 if(guest){$('#submitted button').onclick=()=>openLogin();$('#journey-achievements').onclick=()=>openLogin();}
 if(['10B','10C','10D'].includes(id))openLogin(id);if(id==='10S')notice('登录成功');
}
function openLogin(id='10B'){
 const busy=id==='10C',failed=id==='10D';let timer;
 const sheet=dialog('微信快捷登录',`<p>用于同步想去、计划与投稿记录。</p><p class="scene-microcopy">头像和昵称可稍后设置；不申请手机号。</p>${failed?'<p role="alert" style="color:#914e3e">登录暂未完成，请重试。</p>':''}<button class="scene-primary" data-login ${busy?'disabled':''}>${busy?loader()+' 登录中':'微信快捷登录'}</button><p class="scene-microcopy">继续即确认已阅读隐私说明。</p><button class="scene-inline-button" data-privacy>查看隐私说明</button>`,{onClose:()=>clearTimeout(timer)});
 sheet.querySelector('[data-login]').onclick=e=>{e.currentTarget.disabled=true;e.currentTarget.innerHTML=loader()+' 登录中';timer=setTimeout(()=>{sheet.close();navigateScene('10S');},1200);};
 sheet.querySelector('[data-privacy]').onclick=()=>dialog('隐私说明','<p>微信身份只用于账户关联。附近地点按使用时请求一次位置；创建地点需另行确认坐标与公开资料。</p><p>不自动授权头像、昵称或手机号。</p>');
}
function searchScenes(){
 const id=sceneId,input=$('[data-search-input]'),results=$('[data-results-scroll]')||$('.results-scroll');
 if(!results)return;
 if(id==='12A'){input.value='星湾';input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));const keyboard=document.createElement('div');keyboard.className='scene-keyboard';keyboard.setAttribute('aria-label','输入法占位，实际产品使用微信键盘');keyboard.innerHTML='<span>星湾　观星　地点</span><div>Q W E R T Y U I O P</div><div>A S D F G H J K L</div><div>Z X C V B N M</div><button>搜索</button>';document.querySelector('.phone').append(keyboard);keyboard.querySelector('button').onclick=()=>{keyboard.remove();input.blur();};}
 if(id==='12A-loading'||id==='11E'){results.querySelectorAll('[data-result-group]').forEach(e=>e.hidden=true);results.prepend(status('正在搜索观星点','','', 'loading'));}
 if(id==='12B'){results.querySelectorAll('[data-result-group]').forEach(e=>e.hidden=true);results.prepend(status('没有匹配的观星点','清除条件',()=>{document.querySelector('[data-filter-open]').click();}));}
 if(id==='12C'||id==='11E-refresh')results.prepend(status(id==='12C'?'搜索失败，保留上次结果':'正在更新，保留上次结果',id==='12C'?'重试':'',()=>navigateScene('12A-loading'),id==='12C'?'error':'loading'));
}
