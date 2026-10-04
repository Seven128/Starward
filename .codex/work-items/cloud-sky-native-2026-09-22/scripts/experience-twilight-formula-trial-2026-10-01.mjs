// Isolated implementation of published equations, not imported source/assets.
// Abdurrahman Ozlem, Fast Sky Rendering for Daylight & Twilight (2021), Appendix:
// https://www.researchgate.net/publication/380396923_Fast_Sky_Rendering_for_Daylight_Twilight
// Fixed uniform haze, sea level, 300 DU: illustrative; not local meteorology.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const radians = angle => angle * Math.PI / 180;
const smooth = (a,b,x) => { const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t); };
function environment(sunAlt,viewAlt,azDifference,turbidity=2) {
  const sunCos=Math.sin(radians(sunAlt)),viewCos=Math.sin(radians(viewAlt));
  const tangentHeight=sunCos<0?6371-6371/Math.sqrt(1-sunCos*sunCos):0;
  const mass=(cosine,scale,offset,cap,heightScale)=>Math.min((Math.sqrt(scale*scale*cosine*cosine+offset)-scale*cosine)*Math.exp(-tangentHeight/heightScale),cap);
  const solarR=mass(sunCos,500,1001,75,8.4),solarM=mass(sunCos,1500,3001,200,1.2),solarO=mass(sunCos,125,251,25,40);
  const w1=.03*Math.max(-tangentHeight,0),w2=.03*w1*w1,w3=Math.exp(.3-.05*solarR-1.7*w1)+1e-5;
  const mieG=.06*(turbidity-2+1/turbidity),d=.94*Math.exp(-mieG),g=d*Math.exp(-.02*solarM);
  const ozone=[.00005,.00005,.000005].map(value=>value*300*solarO);
  const mie=[mieG*(.9-.1*d),mieG,mieG/(.9-.1*d)],rayleigh=[.04,.09,.25];
  function view(altitude) {
    const cosine=Math.sin(radians(altitude));
    const viewR=Math.min(Math.sqrt(250000*cosine*cosine+1001)-500*cosine,75);
    const viewM=Math.min(Math.sqrt(2250000*cosine*cosine+3001)-1500*cosine,200);
    const zenith=radians(90-altitude+viewR/57);
    const c=Math.sqrt(1-sunCos*sunCos)*Math.sin(zenith)*Math.cos(radians(azDifference))+sunCos*Math.cos(zenith);
    const scatter=rayleigh.map((r,i)=>{
      const vR=r*viewR,vM=mie[i]*viewM;
      const s=(1-Math.exp(-vR-vM))/(7*vR+vM)*Math.exp(-ozone[i]-w1/viewR-w2);
      return {r:21/(3+d)*vR*2/(2+Math.sqrt(vR*r*solarR))*s,
        m:2.7*(1-g*g)/(3+d+2*d*g*g)/Math.pow(1+g*g-2*g*c,1.5)*vM*Math.exp(-Math.sqrt(vM*mie[i]*solarM)/6)*s,
        a:Math.exp(-ozone[i]-vR-vM)*mieG*g/10/Math.max(1-c,1e-5)};
    });
    const v0=radians(sunAlt-1);
    const v2=v0>=0?Infinity:(2/120)*Math.sin(radians(1+altitude))/(1-Math.cos(v0));
    const reciprocalV=1/(1+1/Math.max(v2+c,0));
    return {scatter,c,reciprocalV};
  }
  const {scatter,c,reciprocalV}=view(viewAlt),zenith=view(90).scatter;
  const phase=1+(c>=0?d:g)*c*c;
  const radiance=scatter.map((v,i)=>1e4*w3*(Math.max(v.r*reciprocalV,zenith[i].r,.002)+v.m+v.a)*phase);
  return {radiance,tangentHeight,solarR,solarM,w1,w3};
}
const input=JSON.parse(await fs.readFile('output/playwright/cloud-sky-twilight-ceiling-1001-r2/result.json','utf8'));
const reference=input.samples.filter(row=>!row.outsideComparableSky);
const encode=value=>value<=.0031308?12.92*value:1.055*Math.pow(value,1/2.4)-.055;
const base=[8,13,23].map(value=>value/255);
const display=(rad,exposure)=>rad.map((value,i)=>Math.round(255*(base[i]+(1-base[i])*encode(1-Math.exp(-value*exposure)))));
const trials=[];
// Bounded global display exposure comparison, no per-ray/color parameter fit.
for(const exposure of [.02,.04,.08])for(const turbidity of [2,3]) {
  const samples=reference.map(row=>({...row,...environment(input.conditions.sun.altitudeDeg,row.altitudeDeg,0,turbidity)}));
  const rgb=samples.map(row=>display(row.radiance,exposure));
  const mae=rgb.flatMap((values,i)=>values.map((value,j)=>Math.abs(value-samples[i].referenceRgb[j]))).reduce((a,b)=>a+b,0)/(rgb.length*3);
  trials.push({exposure,turbidity,mae,samples:samples.map((row,i)=>({alt:row.altitudeDeg,reference:row.referenceRgb,rgb:rgb[i],radiance:row.radiance})),
    directions:[0,90,180].map(az=>({az,samples:[2,10,30,60,90].map(alt=>({alt,rgb:display(environment(input.conditions.sun.altitudeDeg,alt,az,turbidity).radiance,exposure)}))}))});
}
console.log(JSON.stringify({scope:'Published-math CPU feasibility only; no production change, native or whole-quality claim',trials},null,2));
