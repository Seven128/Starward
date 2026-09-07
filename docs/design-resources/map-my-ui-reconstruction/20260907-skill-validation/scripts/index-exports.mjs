import fs from 'node:fs/promises';
import path from 'node:path';
import {hash} from '../../../../../.agents/skills/starward-design-resource/scripts/resource-utils.mjs';
const dir=path.resolve(import.meta.dirname,'..');
const resources={schema:1,assets:[],boards:[],notices:[{text:'页面中的账户、计划与天气数值为共用任务示例，不是实时数据或真实个人资料。地图为公开参考截图，未验证当前微信原生地图外观。'},{text:'地图 © OpenStreetMap 贡献者；数据遵循 ODbL。',href:'https://www.openstreetmap.org/copyright'}]};
const assetPath='assets/osm-reference.png';
resources.assets.push(...JSON.parse(await fs.readFile(path.join(dir,'assets/icon-sources.json'),'utf8')));
resources.assets.push({id:'osm-reference',path:assetPath,sha256:hash(await fs.readFile(path.join(dir,assetPath))),source:'https://www.openstreetmap.org/#map=13/22.48268/114.55571; actual browser capture; see brief.md',license:'OpenStreetMap contributors / ODbL; https://www.openstreetmap.org/copyright'});
for(const group of ['A','B']) {
 const groupDir=path.join(dir,'experiment-1',group);
 let entries;try{entries=await fs.readdir(groupDir);}catch(e){if(e.code==='ENOENT')continue;throw e;}
 for(const folder of entries.filter(n=>/^round-[012](?:-technical-\d+)?$/.test(n)).sort()) {
  const location=path.join(groupDir,folder);let boards;try{boards=JSON.parse(await fs.readFile(path.join(location,'boards.json'),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  for(const board of boards) {
   const reference=async extension=>{const file=path.join(location,board.id+extension);return {path:path.relative(dir,file).replaceAll('\\','/'),sha256:hash(await fs.readFile(file)),revision:board.revision};};
   resources.boards.push({...board,id:board.id+'-'+folder,screenshot:await reference('.png'),snapshot:await reference('.json'),assetIds:board.page==='map'?['osm-reference']:[],codeOwners:board.page==='map'?['apps/wechat-miniapp/src/pages/map/index.tsx','apps/wechat-miniapp/src/pages/map/spot-panel.tsx']:['apps/wechat-miniapp/src/features/my/my-library-page.tsx']});
   delete resources.boards.at(-1).fingerprint;
   if(board.nodeId==='1:5207')resources.boards.at(-1).nativeStatus='historical-before-handoff; latest same-node export: handoff-output/export/handoff-my.json';
  }
 }
}
await fs.writeFile(path.join(dir,'resources.json'),JSON.stringify(resources,null,2)+'\n');console.log(`Indexed ${resources.boards.length} boards`);
