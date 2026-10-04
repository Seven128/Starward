import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createSkyViewBasis,projectSkyDirection,unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts';

const evidence=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22/evidence');
const output=path.join(evidence,'experience-stellar-layer-wide-projection-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const source=JSON.parse(await fs.readFile(path.join(evidence,'experience-stellar-layer-off-marker-2026-09-29.json'),'utf8'));
const basis=createSkyViewBasis(source.anchor.position.azimuthDeg,90+source.anchor.position.altitudeDeg,0)!;
const original=source.results[1];
const bright=original.paintedObjects.find((object:any)=>object.reference==='HR:7009');assert(bright);
const ray=unprojectSkyPoint(bright.x,bright.y,basis,source.width,source.height,original.fov)!;assert(ray);
const brightAz=(Math.atan2(ray[0],ray[1])*180/Math.PI+360)%360;
const brightAlt=Math.asin(ray[2])*180/Math.PI;
const results=[9.05,9.1,9.15].map(fov=>({fov,
 target:projectSkyDirection(original.target[2],original.target[3],basis,source.width,source.height,fov),
 targetAppearance:skyStarAppearance(original.target[1],fov,source.sunAltitudeDeg,original.target[3]),
 bright:{reference:bright.reference,displayName:bright.displayName,
  point:projectSkyDirection(brightAz,brightAlt,basis,source.width,source.height,fov),
  appearance:skyStarAppearance(bright.magnitude,fov,source.sunAltitudeDeg,brightAlt)}}));
assert(results.every(result=>result.targetAppearance===null));
assert(results.every(result=>result.bright.appearance&&result.bright.point));
const record={scope:'Read-only projection from previously validated production geometry; native FOV rounding interval is retained.',
 at:source.at,contextIdSha256:source.contextIdSha256,anchor:source.anchor,width:source.width,height:source.height,
 source:'experience-stellar-layer-off-marker-2026-09-29.json',nativeRoundedFov:9.1,fovInterval:[9.05,9.15],results,
 limits:['Wide target invisibility is a production appearance result; actual native pixels are checked separately.',
  'Bright direction reconstructed from the production snapshot does not replace a native input check.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,results}));
