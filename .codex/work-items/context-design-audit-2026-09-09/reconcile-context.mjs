import fs from 'node:fs';
const root='project_context/areas/main/screen-contracts/wechat-miniapp/';
function edit(p, pairs) { let s=fs.readFileSync(p,'utf8'); for(const [a,b] of pairs) { if(!s.includes(a)) { if(s.includes(b))continue; throw Error(p+' '+a); } s=s.replaceAll(a,b); } fs.writeFileSync(p,s); }
edit(root+'spot-and-sky.md',[
 ['Remote cloud observation continues to use the selected formal spot and shared time','Remote cloud observation continues to use the selected formal spot or authorized pending proposal and shared time'],
 ['The ordinary conclusion uses the declared primary timeline','The displayed weather facts use the declared primary timeline'],
 ['sky-only evidence may remain readable but the formal-spot trip conclusion cannot be positive and explains the missing safety input.','sky-only evidence may remain readable, while the missing safety input remains explicit and cannot relax the existing action checks; no combined trip conclusion is shown.'],
 ['A missing/non-public formal record does not create a spot information panel.','A missing/non-public formal record does not create a formal-spot panel; authorized draft/pending records have their own typed private panel state under the Map identity contract.'],
 ['inherited formal spot/time remain programmatic context and do not consume top chrome.','inherited typed place/time remain the single context and are expressed lightly near the existing date/time region, not in top chrome.'],
 ['for the same formal spot and each real time-ruler slice','for the same authorized observing location and each real time-ruler slice']
]);
edit(root+'map-and-finder.md',[
 ['`map-marker-panel-coordinator`, Search result state and the map accessibility list expose one selected formal spot.','`map-marker-panel-coordinator` owns one selected typed location; public Search returns formal spots, while the owner’s private markers use the location identity contract below. The accessibility list preserves that distinction.'],
 ['`spot-cloud-stargazing-action` validates the formal spot and Observation Context','`spot-cloud-stargazing-action` validates the formal spot or authorized pending proposal and Observation Context'],
 ['containing exactly three icon-labelled actions in left-to-right order:','containing, for a formal spot, exactly three icon-labelled actions in left-to-right order:']
]);
edit('project_context/architecture/runtime-and-domain.md',[
 ['projects that pack for the formal WGS84 spot','projects that pack for the authorized WGS84 observing location'],
 ['before any suitability explanation for consumers','before any suitability explanation for consumers']
]);
console.log('Reconciled scoped residual wording');
