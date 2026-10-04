/** Only rebuild task API exposure with the app's existing Query edition. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'real-query-page-bundle-generated-2026-10-03.mts'),'utf8').replaceAll('\r','');
const tail=s.indexOf('const clientEntry='),end=s.indexOf('const scaffoldSource=',tail);assert(tail>0&&end>tail);
let body=s.slice(tail,end);assert.equal(body.split("from '@tanstack/react-query';").length,2);
body=body.replace("from '@tanstack/react-query';","from './apps/wechat-miniapp/node_modules/@tanstack/react-query/build/modern/index.js';");
const header=`import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),relative=process.argv[2];assert.match(relative,/^output\\/playwright\\/cloud-sky-live-mixed-1003-r[1-9][0-9]*$/);
const out=path.join(ROOT,relative);assert((await fs.stat(path.join(out,'bundle.js'))).isFile());
const bind=async p=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-api-rebuild.mts'));
`;
fs.writeFileSync(path.join(dir,'real-query-api-rebuild-generated-2026-10-03.mts'),header+body+"\nconsole.log(JSON.stringify({output:relative,apiSourceBindings:clientBindings.length,reusedPage:true}));\n",{flag:'wx'});
console.log(JSON.stringify({generated:'real-query-api-rebuild-generated-2026-10-03.mts',productionDependencyChanged:false}));
