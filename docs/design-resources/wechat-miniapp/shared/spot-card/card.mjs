// Shared design-resource component; no routing, status or business state ownership.
const escape=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function spotCardBody({name,region,address,photo}){
 return (photo?'<img src="'+escape(photo)+'" alt="" draggable="false">':'')+'<div class="spot-copy">'+(region?'<span class="spot-region">'+escape(region)+'</span>':'')+'<h3>'+escape(name)+'</h3><p class="spot-address"><span class="spot-address-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><span class="spot-address-text">'+escape(address)+'</span></p></div>';
}
export function spotCard(data){return '<div class="spot-card '+(data.photo?'with-photo':'without-photo')+'">'+spotCardBody(data)+'</div>';}
export function mountSpotCards(root){for(const el of root.querySelectorAll('[data-spot-name]')){const d=el.dataset;el.innerHTML=spotCardBody({name:d.spotName,region:d.spotRegion,address:d.spotAddress,photo:d.spotPhoto});}}
