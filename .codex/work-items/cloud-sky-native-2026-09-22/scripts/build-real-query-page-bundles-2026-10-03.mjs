/** Reuse page extraction, compile actual query wrapper, expose existing Query core. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'shared-page-bundle-generated-2026-10-03.mts'),'utf8').replaceAll('\r','');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,110));s=s.replace(before,after);};
once('current-execution-state-2026-10-03-r46.json','current-execution-state-2026-10-03-r48.json');
once('for(const row of [...checkpoint.protected,...checkpoint.currentSources])assert.deepEqual(await bind(row.path),row);',`const authorised=new Set(['apps/wechat-miniapp/src/services/cache-policy.ts','apps/wechat-miniapp/src/features/sky/use-sky-stellar-supplement.ts','apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-owner.test.ts']);
const transitions=[];for(const row of [...checkpoint.protected,...checkpoint.currentSources]){const current=await bind(row.path);
 if(current.sha256!==row.sha256){assert(authorised.has(row.path)&&!checkpoint.protected.some(p=>p.path===row.path));transitions.push({before:row,after:current});}else assert.deepEqual(current,row);}
await fs.writeFile(path.join(out,'authorised-input-transitions.json'),JSON.stringify(transitions,null,2)+'\\n',{flag:'wx'});`);
s=s.replaceAll('build-shared-page-bundles-2026-10-03.mjs','build-real-query-page-bundles-2026-10-03.mjs').replaceAll('shared-page-bundle-generated-2026-10-03.mts','real-query-page-bundle-generated-2026-10-03.mts');
once('@\\/hooks\\/use-resource-query','@tanstack\\/react-query');
once("a.path==='@/hooks/use-resource-query'?'export const useResourceQuery=(o)=>globalThis.__controlled.query(o);':",
 "a.path==='@tanstack/react-query'?'export const useQuery=(o)=>globalThis.__controlled.actualUseQuery(o);export const onlineManager=globalThis.liveApi.onlineManager;':");
once("'controlled:@/hooks/use-resource-query'","'controlled:@tanstack/react-query'");
once("export * from './apps/wechat-miniapp/src/services/sky-public-image-runtime';\n`;",
 "export * from './apps/wechat-miniapp/src/services/sky-public-image-runtime';\nexport {miniappQueryClient} from './apps/wechat-miniapp/src/services/query-client';\nexport {QueryObserver,onlineManager} from '@tanstack/react-query';\n`;");
fs.writeFileSync(path.join(dir,'real-query-page-bundle-generated-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'real-query-page-bundle-generated-2026-10-03.mts',productionChanged:false}));
