export const preview='/docs/design-resources/wechat-miniapp/shared/comfortable-scale-2026-09-22/preview/';
const journey='/docs/design-resources/wechat-miniapp/shared/journey-sharing-2026-09-22/index.html';
export function hostFor(id,query=new URLSearchParams()){
 let path,params={design_scene:id};
 if(id.startsWith('09')){path=preview+'map-panel.html';params.extent='large';params.media='1';if(!id.startsWith('09E'))params.chapter='astronomy';if(id==='09A'||id==='09E')params.evidence='available';}
 else if(/^10(?:A|B|C|D|S)/.test(id)){path=preview+'my.html';}
 else if(id.startsWith('10E')){path=preview+'settings.html';}
 else if(id.startsWith('10F')||id.startsWith('11')&&!id.startsWith('11E')){path=preview+'map.html';params.map='1';params.browse='1';}
 else if(/^12[A-C]/.test(id)||id.startsWith('11E')){path=preview+'search.html';params.route='search';}
 else if(id.startsWith('12')){path='./reading.html';params.scene=id;}
 else if(id.startsWith('13R')){path=journey;params.state=id==='13R-failed'?'error':'empty';}
 else if(id.startsWith('13')){path=preview+'plan.html';if(!id.startsWith('13A')){params.id='p1';params.weather='available';}if(/^13[B-E]|^13[FG]/.test(id))params.view='edit';if(id.startsWith('13F')||id==='13G')params.review='choose-events';}
 else if(id.startsWith('14S')||/^14[HIJ]/.test(id)&&!id.includes('poster')){path=preview+'settings.html';}
 else if(id.startsWith('14A')){path=preview+'contributions.html';}
 else if(/^14[B-E]/.test(id)){path=preview+'map.html';params.new='1';}
 else {path=journey;params.page=id.includes('spot')?'spot':'trip';if(id==='14G')params.state='expired';if(id==='14G-spot')params.state='unpublished';}
 if(query.has('capture'))params.capture='1';if(query.has('section'))params.scene_section=query.get('section');
 return path+(path.includes('?')?'&':'?')+new URLSearchParams(params);
}
