// Browser design fixture only; future production behavior remains owned by Context.
export const WINDOW_MS=24*60*60*1000;
export function selectUpcomingPlans(plans,now){
 const clock=Number(now);
 if(!Number.isFinite(clock))return{visible:[],total:0,hasMore:false};
 const candidates=plans.flatMap(p=>{
  const start=Date.parse(p.selectedAt),end=Date.parse(p.endsAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return[];
  const ongoing=start<=clock&&clock<end;
  return ongoing||(clock<=start&&start<=clock+WINDOW_MS)?[{...p,ongoing}]:[];
 }).sort((a,b)=>Number(b.ongoing)-Number(a.ongoing)||Date.parse(a.selectedAt)-Date.parse(b.selectedAt)||a.planId.localeCompare(b.planId));
 return{visible:candidates.slice(0,3),total:candidates.length,hasMore:candidates.length>3};
}
