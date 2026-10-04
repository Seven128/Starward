/** Task-local check: compare the actual native lunar pixels with the immutable
 * USGS WMS map under the report's observer-facing IAU body frame. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { calculateMiniappNightSky } from "../../../workers/miniapp-api/src/astronomy-engine-adapter.ts";

const require = createRequire(import.meta.url);
const jpeg = require("jpeg-js") as typeof import("jpeg-js");
const { PNG } = require("pngjs") as typeof import("pngjs");
const root = resolve(new URL("../../..", import.meta.url).pathname.replace(/^\/(\w:)/u, "$1"));
const screenshot = PNG.sync.read(readFileSync(resolve(root, "artifacts/miniapp/cloud-sky-native/moon-detail-21.png")));
const map = jpeg.decode(readFileSync(resolve(root, "workers/miniapp-api/assets/moon/clementine-uv750-v2-wms-2048x1024.jpg")), { useTArray: true });

const at = "2026-09-22T13:00:00.000Z";
const sample = calculateMiniappNightSky({ latitude:22.4826799, longitude:114.5557147, elevationM:0,
  timezone:"Asia/Shanghai", nightDate:"2026-09-22", target:"moon", additionalTimes:[at] })
  .samples.find(row => row.at === at)!;
const frame = sample.moonBodyFrame!;
const radians = Math.PI / 180;
const az = sample.moonAzimuthDeg! * radians, alt = sample.moonAltitudeDeg! * radians;
const direction = [Math.cos(alt)*Math.sin(az), Math.cos(alt)*Math.cos(az), Math.sin(alt)];
const dot = (a:readonly number[],b:readonly number[]) => a.reduce((sum,value,i)=>sum+value*b[i]!,0);
const cross = (a:readonly number[],b:readonly number[]) => [a[1]!*b[2]!-a[2]!*b[1]!,a[2]!*b[0]!-a[0]!*b[2]!,a[0]!*b[1]!-a[1]!*b[0]!];
const unit = (a:readonly number[]) => a.map(value=>value/Math.hypot(...a));
const meridian = frame.primeMeridianEnu, pole = frame.poleEnu, east = cross(pole,meridian);
const observer = [dot(direction,meridian)*-1,dot(direction,east)*-1,dot(direction,pole)*-1];
const north = unit([0,0,1].map((value,i)=>value-observer[i]!*observer[2]!));
const right0 = cross(north,observer), down0 = north.map(value=>-value);

function sourceValue(lon:number,lat:number,flipLon:boolean,flipLat:boolean) {
  const x = ((flipLon ? -lon : lon) / (2*Math.PI) + .5) * (map.width-1);
  const y = (.5 - (flipLat ? -lat : lat)/Math.PI) * (map.height-1);
  const x0 = Math.max(0,Math.min(map.width-2,Math.floor(x)));
  const y0 = Math.max(0,Math.min(map.height-2,Math.floor(y)));
  const dx=x-x0,dy=y-y0;
  const red=(xx:number,yy:number)=>map.data[4*(yy*map.width+xx)]!;
  return (1-dy)*((1-dx)*red(x0,y0)+dx*red(x0+1,y0))+
    dy*((1-dx)*red(x0,y0+1)+dx*red(x0+1,y0+1));
}

function solve(matrix:number[][], vector:number[]) {
  const a=matrix.map((row,i)=>[...row,vector[i]!]);
  for(let i=0;i<vector.length;i++) {
    let best=i;
    for(let j=i+1;j<vector.length;j++) if(Math.abs(a[j]![i]!)>Math.abs(a[best]![i]!))best=j;
    [a[i],a[best]]=[a[best]!,a[i]!];
    const divisor=a[i]![i]!;
    for(let k=i;k<=vector.length;k++)a[i]![k]!/=divisor;
    for(let j=0;j<vector.length;j++)if(j!==i){const scale=a[j]![i]!;for(let k=i;k<=vector.length;k++)a[j]![k]!-=scale*a[i]![k]!;}
  }
  return a.map(row=>row[vector.length]!);
}

const center={x:Number(process.argv[2]??244),y:Number(process.argv[3]??453)};
const radius=Number(process.argv[4]??89.5),minimumGray=Number(process.argv[5]??55);
const pixels:{x:number;y:number;rx:number;ry:number;basis:number[];observed:number}[]=[];
for(let y=366;y<=540;y+=2)for(let x=156;x<=332;x+=2){
  const rx=(x-center.x)/radius,ry=(y-center.y)/radius;
  if(rx*rx+ry*ry>.77 || rx*rx+ry*ry<.01)continue;
  const offset=4*(y*screenshot.width+x);
  const observed=(screenshot.data[offset]!+screenshot.data[offset+1]!+screenshot.data[offset+2]!)/3;
  if(observed<minimumGray)continue; // Unlit crescent and black background have non-linear phase shading.
  pixels.push({x,y,rx,ry,basis:[1,rx,ry,rx*rx,ry*ry,rx*ry],observed});
}
const dimensions=6;
const gram=Array.from({length:dimensions},()=>Array(dimensions).fill(0) as number[]);
for(const pixel of pixels)for(let i=0;i<dimensions;i++)for(let j=0;j<dimensions;j++)gram[i]![j]!+=pixel.basis[i]!*pixel.basis[j]!;
const residual=(values:number[])=>{
  const rhs=Array(dimensions).fill(0) as number[];
  values.forEach((value,k)=>pixelBasis(k).forEach((term,i)=>rhs[i]!+=term*value));
  const fit=solve(gram,rhs);
  return values.map((value,k)=>value-dot(pixelBasis(k),fit));
};
const pixelBasis=(index:number)=>pixels[index]!.basis;
const observedResidual=residual(pixels.map(pixel=>pixel.observed));
const observedNorm=Math.hypot(...observedResidual);
const results=[];
for(const flipLon of [false,true])for(const flipLat of [false,true]) {
  let best={angleDeg:0,correlation:-2};
  for(let angleDeg=0;angleDeg<360;angleDeg++) {
    const angle=angleDeg*radians,c=Math.cos(angle),s=Math.sin(angle);
    const right=right0.map((value,i)=>c*value+s*down0[i]!);
    const down=down0.map((value,i)=>-s*right0[i]!+c*value);
    const texture=pixels.map(pixel=>{
      const facing=Math.sqrt(1-pixel.rx*pixel.rx-pixel.ry*pixel.ry);
      const body=observer.map((value,i)=>value*facing+right[i]!*pixel.rx+down[i]!*pixel.ry);
      return sourceValue(Math.atan2(body[1]!,body[0]!),Math.asin(body[2]!),flipLon,flipLat);
    });
    const templateResidual=residual(texture);
    const correlation=dot(observedResidual,templateResidual)/(observedNorm*Math.hypot(...templateResidual));
    if(correlation>best.correlation)best={angleDeg,correlation};
  }
  results.push({flipLon,flipLat,...best});
}
const registered=results.find(result=>!result.flipLon&&!result.flipLat)!;
const registrationAngle=registered.angleDeg*radians;
const registeredRight=right0.map((value,i)=>Math.cos(registrationAngle)*value+Math.sin(registrationAngle)*down0[i]!);
const registeredDown=down0.map((value,i)=>-Math.sin(registrationAngle)*right0[i]!+Math.cos(registrationAngle)*value);
const landmarks=[
  {name:"Mare Tranquillitatis",latitudeDeg:8.35,longitudeDeg:30.83,source:"https://planetarynames.wr.usgs.gov/Feature/3691"},
  {name:"Mare Imbrium",latitudeDeg:34.72,longitudeDeg:-14.91,source:"https://planetarynames.wr.usgs.gov/Feature/3678"},
  {name:"Mare Crisium",latitudeDeg:16.18,longitudeDeg:59.10,source:"https://planetarynames.wr.usgs.gov/Feature/3671"},
].map(item=>{
  const lat=item.latitudeDeg*radians,lon=item.longitudeDeg*radians;
  const position=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];
  const x=center.x+radius*dot(position,registeredRight),y=center.y+radius*dot(position,registeredDown);
  const ix=Math.round(x),iy=Math.round(y),offset=4*(iy*screenshot.width+ix);
  return {...item,x,y,facing:dot(position,observer),mapGray:sourceValue(lon,lat,false,false),
    screenshotGray:(screenshot.data[offset]!+screenshot.data[offset+1]!+screenshot.data[offset+2]!)/3};
});
console.log(JSON.stringify({screenshot:{width:screenshot.width,height:screenshot.height,center,radius,minimumGray},
  map:{width:map.width,height:map.height},at,observerBody:observer,sampledPixels:pixels.length,results,landmarks},null,2));
