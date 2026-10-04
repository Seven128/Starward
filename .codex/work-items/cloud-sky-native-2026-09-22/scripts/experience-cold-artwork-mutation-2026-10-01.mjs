import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=task+'/tmp/cold-artwork-suspend-noop-2026-10-01.mjs';
const result=await build({entryPoints:['apps/wechat-miniapp/src/features/sky/sky-artwork-file-retention.test.ts'],bundle:true,write:false,platform:'node',format:'esm',target:'node24',plugins:[{name:'bounded-suspension-noop',setup(builder){builder.onLoad({filter:/[\\/]sky-artwork-loader\.ts$/},async args=>{const source=await fs.readFile(args.path,'utf8'),target='suspendUnusedDecoded(){';assert.equal(source.split(target).length,2);return{contents:source.replace(target,target+'return;'),loader:'ts'};});}}]});
await fs.writeFile(output,result.outputFiles[0].contents,{flag:'wx'});
console.log(JSON.stringify({output,mutation:'One no-op at the suspension owner; production source untouched'}));
