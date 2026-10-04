import {readFileSync} from "node:fs";
import {createBsc5pSkyCatalogProvider} from "../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts";
import {createSkyViewBasis} from "../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import {selectSkyStellarTiles} from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts";
import {SKY_STELLAR_VIEW_BYTES} from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts";

const publication=JSON.parse(readFileSync(new URL("../../../workers/miniapp-api/assets/sao/index.json",import.meta.url),"utf8"));
const provider=createBsc5pSkyCatalogProvider();
const catalog=provider.load();
const observer={latitude:22.5,longitude:114.5,elevationM:20};
const at="2026-10-08T13:00:00.000Z";
const frame=provider.frame({...observer,at:new Date(at),catalog});
const rows=[];
for(const fov of [267.8,128.8,45,20,5,1.5,.15])for(const pitch of [-60,-30,0,30,60,90])for(const heading of [0,30,60,90,120,150,180,210,240,270,300,330]){
  const basis=createSkyViewBasis(heading,pitch,0);
  if(!basis)throw new Error("sky_basis_missing");
  const selected=selectSkyStellarTiles(publication.tiles,{frame,
    expected:{catalog,at,observer},basis,width:390,height:844,verticalFovDeg:fov,
    center:{x:195,y:422}});
  const bytes=selected.reduce((total,tile)=>total+tile.bytes,0);
  rows.push({fov,pitch,heading,tiles:selected.length,bytes,overBudget:bytes>SKY_STELLAR_VIEW_BYTES,
    faintestMinimum:selected.length?Math.max(...selected.map(tile=>tile.minMagnitude)):null});
}
const byFov=[...new Set(rows.map(row=>row.fov))].map(fov=>({fov,
  maxBytes:Math.max(...rows.filter(row=>row.fov===fov).map(row=>row.bytes)),
  maxTiles:Math.max(...rows.filter(row=>row.fov===fov).map(row=>row.tiles))}));
process.stdout.write(`${JSON.stringify({at,observer,limitBytes:SKY_STELLAR_VIEW_BYTES,
  samples:rows.length,overBudget:rows.filter(row=>row.overBudget).length,
  max:rows.reduce((a,b)=>b.bytes>a.bytes?b:a),byFov,rows},null,2)}\n`);
