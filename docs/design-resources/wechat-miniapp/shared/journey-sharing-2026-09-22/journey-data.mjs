// Representative design records, not account data or observed visits.
export const journeys=[
 {id:'perseids',spotId:'bay',start:'2026-08-12T21:00:00+08:00',end:'2026-08-13T02:00:00+08:00',timezone:'Asia/Shanghai',eventIds:['event-occurrence:007-per:2026']},
 {id:'summer',spotId:'hill',start:'2026-07-18T21:00:00+08:00',end:'2026-07-19T01:30:00+08:00',timezone:'Asia/Shanghai',eventIds:[]},
 {id:'upcoming',spotId:'bay',start:'2026-12-14T21:00:00+08:00',end:'2026-12-15T02:00:00+08:00',timezone:'Asia/Shanghai',eventIds:['event-occurrence:004-gem:2026']}
];
export function summarize(records,year,now){
 const seen=new Set();
 const ended=records.filter(p=>{
  const start=Date.parse(p.start),end=Date.parse(p.end);
  if(seen.has(p.id)||p.deleted||p.cancelled||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end>now)return false;
  if(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:p.timezone}).format(end)!==String(year))return false;
  seen.add(p.id);return true;
 }).sort((a,b)=>Date.parse(b.end)-Date.parse(a.end));
 return {ended,count:ended.length,spots:new Set(ended.map(p=>p.spotId)).size,events:new Set(ended.flatMap(p=>p.eventIds)).size};
}
