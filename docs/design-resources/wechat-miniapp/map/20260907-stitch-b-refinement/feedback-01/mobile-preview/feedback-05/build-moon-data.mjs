import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),A=require('astronomy-engine');
const root=new URL('./',import.meta.url);
const names=['新月','娥眉月','上弦月','盈凸月','满月','亏凸月','下弦月','残月'];
function svg(angle){const r=9,c=12,wax=angle<=180,k=Math.cos(angle*Math.PI/180),edge=[],term=[];for(let i=0;i<=40;i++){const y=-r+2*r*i/40,x=Math.sqrt(Math.max(0,r*r-y*y));edge.push([c+(wax?x:-x),c+y]);term.unshift([c+(wax?k*x:-k*x),c+y]);}return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#7e8882"/><path d="M${[...edge,...term].map(p=>p.map(x=>x.toFixed(3)).join(',')).join('L')}Z" fill="#f3f0da"/><circle cx="12" cy="12" r="9" fill="none" stroke="#9ca79f" stroke-width=".7"/></svg>`;}
await fs.mkdir(new URL('assets/moon/',root),{recursive:true});
for(let i=0;i<8;i++)await fs.writeFile(new URL(`assets/moon/phase-${i}.svg`,root),svg(i*45));
const obs=new A.Observer(22.6,114.1,128),days=[];
const fmt=t=>t?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(t.date):null;
for(let d=-7;d<=15;d++){
 const noon=new Date(Date.UTC(2026,8,8+d,4)),date=new Date(noon.getTime()+8*3600000).toISOString().slice(0,10);
 const rise=A.SearchRiseSet(A.Body.Moon,obs,1,noon,1),set=A.SearchRiseSet(A.Body.Moon,obs,-1,noon,1);
 const hours=[];
 for(let j=0;j<=24;j++){const at=new Date(noon.getTime()+(6+j*.5)*3600000),phase=A.MoonPhase(at),illum=A.Illumination(A.Body.Moon,at).phase_fraction,eq=A.Equator(A.Body.Moon,at,obs,true,true),alt=A.Horizon(at,obs,eq.ra,eq.dec).altitude;
  const code=Math.round(phase/45)%8;
  hours.push({at:fmt({date:at}).slice(-5),iso:at.toISOString(),next:j>=12,phase:code,phaseName:names[code],phaseAngle:phase,illum:Number((illum*100).toFixed(1)),moonAlt:Number(alt.toFixed(1)),cloud:Math.max(8,30+d-j%6),low:8,mid:12,high:25,temp:22-Math.floor(j/7),humidity:78,dew:18,wind:9,gust:16,visibility:24,rain:0,chance:10,one:52,two:61});
 }
 days.push({date,label:date.slice(5).replace('-','月')+'日',offset:d,rise:fmt(rise),set:fmt(set),hours});
}
await fs.writeFile(new URL('assets/moon-data.js',root),'window.designDays='+JSON.stringify(days)+';');
await fs.writeFile(new URL('assets/moon-metadata.json',root),JSON.stringify({algorithm:'astronomy-engine@2.1.19',latitude:22.6,longitude:114.1,elevationM:128,timezone:'Asia/Shanghai',nightBoundary:'local noon to next noon',referenceToday:'2026-09-08',purpose:'offline calculations for fictional design location, not live spot facts',weather:'independent synthetic layout values',phaseIcons:'eight nearest 45-degree phase sectors; symbolic, not actual sky orientation',source:'https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md'},null,2));
console.log('Built 23 nights × 25 half-hour moon samples and 8 SVG assets.');

