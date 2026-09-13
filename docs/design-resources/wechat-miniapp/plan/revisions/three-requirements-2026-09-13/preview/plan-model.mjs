export const now=Date.parse('2026-09-10T16:00:00+08:00');
export const spots=[{id:'bay',name:'星湾观星点',address:'东岸路观景步道入口'},{id:'hill',name:'山顶观星点',address:'山顶步道北入口'},{id:'coast',name:'海岸观星点',address:'海岸观景步道'},{id:'field',name:'草甸观星点',address:'草甸观景平台'}];
export const checklist=['路线与开放信息','红光灯与备用电池','同行与返程联系人','天气与官方预警','饮水与薄外套'];
export const createPlans=()=>[
 {planId:'p1',spotId:'bay',selectedAt:'2026-09-10T20:30:00+08:00',notes:'沿海平台拍银河，带三脚架',checks:[true,true,false,false,false]},
 {planId:'p2',spotId:'hill',selectedAt:'2026-09-10T23:00:00+08:00',notes:'先确认夜间步道是否开放',checks:[true,false,false,false,false]},
 {planId:'p3',spotId:'coast',selectedAt:'2026-09-11T05:00:00+08:00',notes:'',checks:[false,false,false,false,false]},
 {planId:'p4',spotId:'field',selectedAt:'2026-09-11T12:00:00+08:00',notes:'提前熟悉场地与入口',checks:[false,false,false,false,false]},
 {planId:'future',spotId:'bay',selectedAt:'2026-10-10T20:30:00+08:00',notes:'带上望远镜和折叠椅',checks:[false,false,false,false,false]},
 {planId:'past',spotId:'hill',selectedAt:'2026-09-07T21:00:00+08:00',notes:'晚间观测计划',checks:[true,true,false,false,true]}
];
export function ordered(plans,past=false){return plans.filter(p=>Number.isFinite(Date.parse(p.selectedAt))&&(past?Date.parse(p.endAt)<=now:Date.parse(p.endAt)>now)).sort((a,b)=>(past?-1:1)*(Date.parse(a.selectedAt)-Date.parse(b.selectedAt))||a.planId.localeCompare(b.planId));}
export const localParts=p=>{const d=new Date(p.selectedAt);return{date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),time:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d)}};
export const spotFor=p=>spots.find(s=>s.id===p.spotId);
export function dateLabel(date){const [y,m,d]=date.split('-');return(date==='2026-09-10'?'今天 · ':date==='2026-09-11'?'明天 · ':'')+Number(m)+'月'+Number(d)+'日';}
