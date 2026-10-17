// Stitch visual source; scoped integration only. All data below is design-only.
const rootPath='/docs/design-resources/wechat-miniapp/map/revisions/neighborhood-environment-2026-10-17/';
export async function mountNeighborhoodHorizon(){
 const chapter=document.querySelector('#terrain');if(!chapter||document.querySelector('#terrain-horizon'))return;
 const host=document.createElement('div');host.id='terrain-horizon';const root=host.attachShadow({mode:'open'});
 const markup=await fetch(rootPath+'horizon-fragment.html').then(r=>{if(!r.ok)throw Error('design_fragment_missing');return r.text();});
 root.innerHTML='<link rel="stylesheet" href="'+rootPath+'horizon.css">'+markup;
 const mountainLayer=root.querySelector('#mountainLayer'),overlayState=root.querySelector('#overlayState'),metaSummary=root.querySelector('#metaSummary');
     function applyState(state) {
      if (state === 'normal') {
        overlayState.style.display = 'none';
        mountainLayer.innerHTML = `
          <polygon class="th-mountain-fill" points="24,100 24,78 40,75 60,62 80,72 97,85 120,54 145,42 170,68 200,82 220,88 230,90 255,70 280,60 290,72 300,75 316,80 316,100"/>
          <path class="th-mountain-stroke" d="M 24,78 L 40,75 L 60,62 L 80,72 L 97,85 L 120,54 L 145,42 L 170,68 L 200,82 L 220,88 L 230,90 L 255,70 L 280,60 L 290,72 L 300,75 L 316,80"/>
        `;
        metaSummary.textContent = '低空轮廓估算 · 近物情况待现场核对';
        metaSummary.style.background = 'var(--accent-green-bg)';
        metaSummary.style.color = 'var(--text-secondary)';
      } else if (state === 'partial') {
        overlayState.style.display = 'none';
        mountainLayer.innerHTML = `
          <polygon class="th-mountain-fill" points="24,100 24,78 40,75 60,62 80,72 97,85 120,54 145,42 170,68 200,82 220,88 220,100"/>
          <path class="th-mountain-stroke" d="M 24,78 L 40,75 L 60,62 L 80,72 L 97,85 L 120,54 L 145,42 L 170,68 L 200,82 L 220,88"/>
          <rect x="220" y="25" width="70" height="75" fill="url(#missingHatch)"/>
          <line x1="220" y1="25" x2="220" y2="100" class="th-missing-border"/>
          <line x1="290" y1="25" x2="290" y2="100" class="th-missing-border"/>
          <text x="255" y="66" class="th-missing-text">高程缺测</text>
          <polygon class="th-mountain-fill" points="290,100 290,72 300,75 316,80 316,100"/>
          <path class="th-mountain-stroke" d="M 290,72 L 300,75 L 316,80"/>
        `;
        metaSummary.textContent = '部分方向高程缺测';
        metaSummary.style.background = '#FFF4E5';
        metaSummary.style.color = '#9A6700';
      } else if (state === 'loading') {
        overlayState.style.display = 'flex';
        overlayState.innerHTML = `
          <div class="th-loading-dots">
            <div class="th-dot"></div>
            <div class="th-dot"></div>
            <div class="th-dot"></div>
          </div>
          <div class="th-state-title">正在读取山体轮廓</div>
        `;
      } else if (state === 'failed') {
        overlayState.style.display = 'flex';
        overlayState.innerHTML = `
          <div class="th-state-title">山体轮廓暂时无法读取</div>
          <div class="th-state-desc">可重新尝试获取</div>
          <button class="th-retry-btn" onclick="retryFetch()">重新获取</button>
        `;
      }
    }


 const chosen=new URLSearchParams(location.search).get('horizon')||'normal';applyState(['normal','partial','loading','failed'].includes(chosen)?chosen:'normal');
 root.addEventListener('click',e=>{if(e.target.closest('.th-retry-btn'))applyState('loading');});
 root.querySelectorAll('[onclick]').forEach(e=>e.removeAttribute('onclick'));
 chapter.querySelector('.terrain-provenance')?.before(host);if(!host.isConnected)chapter.append(host);
 return host;
}
