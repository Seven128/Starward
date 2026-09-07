// Task-local independent inspection of actual Figma snapshots, not generator metadata.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const task=path.resolve(import.meta.dirname,'..'), trial=Number(process.argv[2]||2),base=path.join(task,`experiment-${trial}`);
const intersect=(a,b)=>({x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)),height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))});
const area=a=>a.width*a.height;
const luminance=c=>['r','g','b'].map(k=>c[k]<=.04045?c[k]/12.92:((c[k]+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
function flatten(root){const out=[];function visit(n,parent,clip,bg,shown=true){const box=n.absoluteBoundingBox;if(!box)return;const visible=intersect(box,clip),live=shown&&n.visible!==false&&(n.opacity??1)>0;let surface=bg;for(const p of n.type==='TEXT'?[]:n.fills||[])if(p.visible!==false){if(p.type==='SOLID'&&(p.opacity??1)===1&&(n.opacity??1)===1)surface=p.color;else surface=null;}const e={n,parent,box,visible,live:live&&area(visible)>.1,bg:surface};out.push(e);for(const c of n.children||[])visit(c,e,n.clipsContent?visible:clip,surface,live);}visit(root,null,root.absoluteBoundingBox,null);return out;}
const ancestor=(a,b)=>{for(let p=a.parent;p;p=p.parent)if(p===b)return true;return false;};
const reports=[];
for(const group of ['A','B'])for(const folder of (await fs.readdir(path.join(base,group))).filter(n=>/^round-[012](?:-technical-\d+)?$/.test(n)).sort())for(const file of (await fs.readdir(path.join(base,group,folder))).filter(n=>n.endsWith('.json')&&n!=='boards.json')){
 const src=path.join(base,group,folder,file),snap=JSON.parse(await fs.readFile(src,'utf8')),entries=flatten(snap.root),issues=[],controls=entries.filter(e=>e.live&&e.n.controlKey),texts=entries.filter(e=>e.live&&e.n.type==='TEXT'&&e.n.characters),textStyles={};
 for(const e of controls)if(e.visible.width<43.99||e.visible.height<43.99)issues.push({kind:'target-under44-or-clipped',id:e.n.id,key:e.n.controlKey,visible:e.visible});
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i],b=controls[j],over=intersect(a.visible,b.visible);if(over.width>.1&&over.height>.1&&!ancestor(a,b)&&!ancestor(b,a))issues.push({kind:'target-overlap',a:a.n.controlKey,b:b.n.controlKey,ids:[a.n.id,b.n.id],overlap:over});}
 const contrasts=[];
 for(const e of texts){const k=`${e.n.fontSize}/${e.n.lineHeight?.value}/${e.n.fontName?.style}`;textStyles[k]=(textStyles[k]||0)+1;if(area(e.visible)<area(e.box)*.98)issues.push({kind:'text-clipped',id:e.n.id,text:e.n.characters});for(const p of e.n.fills||[])if(p.type==='SOLID'&&p.visible!==false&&(p.opacity??1)===1&&e.bg){const value=ratio(p.color,e.bg);contrasts.push(value);if(value<4.5-.01)issues.push({kind:'text-contrast',id:e.n.id,text:e.n.characters,ratio:value});}}
 for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i],b=texts[j],ab=a.n.absoluteRenderBounds,bb=b.n.absoluteRenderBounds;if(!ab||!bb)continue;const over=intersect(intersect(ab,a.visible),intersect(bb,b.visible));if(over.width>1&&over.height>1)issues.push({kind:'text-ink-bounds-overlap-review',ids:[a.n.id,b.n.id],texts:[a.n.characters,b.n.characters],overlap:over});}
 const png=await fs.readFile(src.replace(/\.json$/,'.png'));reports.push({file:path.relative(base,src).replaceAll('\\','/'),rootId:snap.root.id,sha256:createHash('sha256').update(png).digest('hex'),visibleTextCount:texts.length,visibleControlCount:controls.length,textStyles,minimumSolidTextContrast:contrasts.length?Math.min(...contrasts):null,issues});
}
const result={scope:'Actual exported core frames; bounds and opaque ancestor solid colors only. No native gestures, semantic reachability, sibling occlusion, complex paint contrast or aesthetic pass inferred.',reports};
await fs.writeFile(path.join(base,'core-inspection.json'),JSON.stringify(result,null,2)+'\n');
for(const r of reports)console.log(JSON.stringify({file:r.file,issues:r.issues.length,minimumContrast:r.minimumSolidTextContrast,types:[...new Set(r.issues.map(x=>x.kind))]}));
