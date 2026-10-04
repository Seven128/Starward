/** Read-only local metadata/source binding. No HTTP, image sampling/decode or publication. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const bind=name=>{const b=fs.readFileSync(path.join(ROOT,name));return {path:name,bytes:b.length,sha256:hash(b)}};
let output='output/selected-w3-identity-audit-1002-r1';for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/selected-w3-identity-audit-1002-r${n}`;
const dir=path.join(ROOT,output);fs.mkdirSync(dir);
const manifestName='workers/miniapp-api/assets/deep-sky/manifest.json',raw=fs.readFileSync(path.join(ROOT,manifestName)),m=JSON.parse(raw);
const assetRecords=m.entries.flatMap(e=>Object.entries(e.levels).map(([level,a])=>({reference:e.objectRef,level,...a})));
const previous=m.previousPublicationHashes.map(h=>{const p=`workers/miniapp-api/assets/deep-sky/publications/${h}.json`,b=fs.readFileSync(path.join(ROOT,p)),v=JSON.parse(b);
 return {...bind(p),publicationHash:hash(JSON.stringify(v)),filenameHash:h,schemaVersion:v.schemaVersion,entries:v.entries.length};});
const files=['apps/wechat-miniapp/src/services/api-client.ts','apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts',
 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx','apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',
 'apps/wechat-miniapp/src/services/bare-sky-resource.ts','apps/wechat-miniapp/src/hooks/use-celestial-information.ts',
 'apps/wechat-miniapp/src/sky/sources/index.tsx','workers/miniapp-api/src/deep-sky-imagery.ts',
 'workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/deep-sky-scene-provider.ts',
 'workers/miniapp-api/src/sky-public-asset-export.ts','workers/miniapp-api/src/sky-public-asset-headers.ts',
 'packages/miniapp-contracts/src/api-shapes.ts','packages/miniapp-contracts/src/deep-sky-image-publication.ts',
 'packages/miniapp-contracts/api/miniapp.operations.json','packages/miniapp-contracts/src/generated/miniapp-api.generated.ts',
 'data-pipelines/deep-sky/README.md',manifestName];
const before=files.map(bind);
const value={status:'READ_ONLY_AUDIT',sourceBindings:before,manifest:{...bind(manifestName),schemaVersion:m.schemaVersion,
 publicationHash:hash(JSON.stringify(m)),publicationId:m.publicationId,entryCount:m.entryCount,
 jpegLevels:assetRecords.filter(a=>a.imageFormat!=='png').length,pngLevels:assetRecords.filter(a=>a.imageFormat==='png').length,
 manifestDeclaredImageBytes:assetRecords.reduce((sum,a)=>sum+a.bytes,0),previousPublicationHashes:m.previousPublicationHashes,legacyPublicationHash:m.legacyPublicationHash,
 allValidFractionUnknown:assetRecords.every(a=>a.validFraction===null&&a.coverageState==='NOT_MEASURED'),
 source:m.source,distribution:m.distribution,
 representatives:m.entries.filter(e=>['M:31','M:42','M:51','M:82'].includes(e.objectRef)).map(e=>({reference:e.objectRef,center:e.center,
 levels:Object.fromEntries(Object.entries(e.levels).map(([level,a])=>[level,{file:a.file,sha256:a.sha256,bytes:a.bytes,pixels:a.pixels,fieldDegrees:a.fieldDegrees,
 imageFormat:a.imageFormat??'jpeg',sourceMissingPixels:a.sourceFiniteMask?.missingPixels??null,displaySupport:a.displaySupport??null}]))}))},previous,
 limits:['No external request, image decode/processing, source acquisition or runtime; manifest declared bytes are metadata, not new raw-array/content readback evidence.',
 'Fresh M82 DETAIL science/display trials remain outside this published manifest. Other unacquired/unknown level coverage remains unknown.',
 'Byte identity/discovery support does not certify absolute WCS, scientific coverage, quality, native persistence, GPU or final acceptance.']};
if(JSON.stringify(files.map(bind))!==JSON.stringify(before))throw new Error('source_changed_during_audit');
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(dir,'executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:bind(output+'/result.json'),manifest:value.manifest.publicationHash,entries:m.entryCount,jpeg:value.manifest.jpegLevels,png:value.manifest.pngLevels,bytes:value.manifest.manifestDeclaredImageBytes,previous:previous.map(p=>({hash:p.publicationHash,filenameHash:p.filenameHash,schemaVersion:p.schemaVersion}))},null,2));
