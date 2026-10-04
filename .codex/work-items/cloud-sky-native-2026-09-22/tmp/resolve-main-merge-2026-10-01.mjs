import {readFileSync,writeFileSync} from 'node:fs';
const root='E:/dev/Starward/';
function resolve(file,choices){let n=0;let text=readFileSync(root+file,'utf8');text=text.replace(/^<<<<<<<[^\n]*\r?\n([\s\S]*?)^\|\|\|\|\|\|\|[^\n]*\r?\n([\s\S]*?)^=======\r?\n([\s\S]*?)^>>>>>>>[^\n]*\r?\n/gm,(_,ours,base,theirs)=>{const choice=choices[n++];if(!choice)throw new Error(file+':missing_resolution');return typeof choice==='function'?choice(ours,theirs):choice==='ours'?ours:choice==='theirs'?theirs:choice;});if(n!==choices.length)throw new Error(file+':unexpected_conflict_count:'+n);writeFileSync(root+file,text);}
resolve('apps/wechat-miniapp/config/index.ts',['theirs',(ours,theirs)=>theirs.replace('["noble-hashes", "runtime-dependencies"]','["noble-hashes"]')]);
resolve('apps/wechat-miniapp/src/components/source-attribution.tsx',[(ours,theirs)=>theirs.replace('{credit.name} · {credit.url}','{compact ? "复制来源链接" : `复制链接 · ${credit.name} · ${credit.url}`}')]);
resolve('apps/wechat-miniapp/src/components/source-attribution.scss',[(ours,theirs)=>theirs.replace('  text-align: left;','  text-align: left;\n  font-size: 13Px;\n  line-height: 20Px;')]);
resolve('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',['theirs']);
resolve('apps/wechat-miniapp/src/services/api-request-test-support.ts',[(ours,theirs)=>theirs.replace('options?: { cache?:','options?: { independent?: boolean; cache?:')]);
resolve('apps/wechat-miniapp/src/services/sky-report-catalog.test.ts',[(ours,theirs)=>ours.replace('isCelestialObjectReference }','isCelestialObjectReference, SKY_PLANET_ORDER }')]);
resolve('apps/wechat-miniapp/src/state/app-store.ts',[(ours,theirs)=>theirs+'      if (!get().accountOwnerId) return;\n']);
resolve('docs/design-resources/wechat-miniapp/sky/ADOPTED.md',['theirs']);
resolve('project_context/areas/main/screen-contracts/wechat-miniapp/shared-state-and-recovery.md',[(ours,theirs)=>ours+'\n'+theirs,(ours,theirs)=>ours+'\n'+theirs]);
console.log('Resolved nine manually reviewed files; regenerate SDK next.');
