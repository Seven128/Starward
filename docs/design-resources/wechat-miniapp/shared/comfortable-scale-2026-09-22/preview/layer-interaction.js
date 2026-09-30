// All date/sky/weather records are the existing isolated design samples.
// This page does not request a real MapScene or infer map polygons.
(() => {
  const check = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" aria-hidden="true"><path d="m4 12 5 5 11-11" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const cards = [...document.querySelectorAll('[data-layer]')];
  const toggle = document.querySelector('#layer-toggle'), panel = document.querySelector('#layer-panel');
  let selectedLayer = 'TOTAL_CLOUD';
  cards.forEach(card => {
    card.lastElementChild.className = 'layer-check';
    const text = card.children[1]; text.children[0].className = 'layer-title'; text.children[1].className = 'layer-subtitle';
    const light = card.dataset.layer === 'LIGHT';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox','0 0 24 24'); icon.setAttribute('aria-hidden','true'); icon.classList.add('layer-icon');
    icon.innerHTML = light ? '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 .8-1 1.8-1 2H9c0-.2 0-1.2-1-2Z"/>' : '<path d="M7 18a4 4 0 0 1-.7-7.94A6 6 0 0 1 18 9a4.5 4.5 0 0 1 .5 9Z"/>';
    const label = document.createElement('span'); label.textContent = light ? '光污染' : '云量';
    text.children[0].replaceChildren(icon,label); card.setAttribute('aria-label',label.textContent);
  });
  function render() {
    const cloud = selectedLayer === 'TOTAL_CLOUD';
    const region = document.querySelector('#layer-time-region');
    region.inert = !cloud;
    region.setAttribute('aria-hidden', String(!cloud));
    document.querySelector('#layer-source').textContent = cloud ? '云量预报 · 仅覆盖有数据区域' : '年度夜光估算 · 不随观测时间变化';
    const items = selectedLayer === 'LIGHT'
      ? [['#87714A','相对较低'],['#BE9B61','相对中等'],['#E0C998','相对较高']]
      : [['#4E8E9B','少云 0–30%'],['#76AAB2','中等 31–65%'],['#A9C9CE','多云 66–100%']];
    document.querySelector('#layer-legend').innerHTML = items.map(([color,text]) => '<span><i style="background:'+color+'"></i>'+text+'</span>').join('');
    cards.forEach(card => { const active = card.dataset.layer === selectedLayer; card.setAttribute('aria-checked', String(active)); card.tabIndex = active ? 0 : -1; card.lastElementChild.innerHTML = active ? check : ''; });
    document.body.dataset.selectedLayer = selectedLayer;
  }
  window.layerObservationTime = window.StarwardObservationTime.mount(document.querySelector('#layer-time'), {
    days:window.designDays, dayIndex:7, index:6,
    onChange:render
  });
  function select(card) { if (selectedLayer === card.dataset.layer) return; window.layerObservationTime.cancel(); selectedLayer = card.dataset.layer; card.focus({preventScroll:true}); render(); }
  cards.forEach(card => {
    card.addEventListener('click', () => select(card));
    card.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === 'Home' ? cards[0] : e.key === 'End' ? cards[1] : cards.find(c => c !== card);
      select(next); next.focus();
    });
  });
  function open(value) {
    window.layerObservationTime.cancel(); if(window.StarwardFluid.show)StarwardFluid.show(panel,value);else panel.hidden=!value; toggle.setAttribute('aria-expanded',String(value)); document.body.dataset.layerOpen = String(value);
    if (!value) toggle.focus({preventScroll:true});
  }
  toggle.addEventListener('click', () => open(document.body.dataset.layerOpen!=='true'));
  document.querySelector('.map-bg').addEventListener('click', () => open(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { e.preventDefault(); open(false); } });
  // Keep the existing design components available for direct review.
  document.querySelector('#primary-nav').setAttribute('aria-label','主导航（静态背景）');
  render();
})();
