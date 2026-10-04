/** Current standard exporter with preserved real v2/v3/Prepared generations. */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {SdssOpticalImageryService} from '../../../../workers/miniapp-api/src/sdss-optical-imagery.ts';
import {PreparedOpticalImageryService} from '../../../../workers/miniapp-api/src/prepared-optical-imagery.ts';
import {approvedSkyPublicAssets,exportSkyPublicAssets} from '../../../../workers/miniapp-api/src/sky-public-asset-export.ts';
import {skyPublicAssetHeaders} from '../../../../workers/miniapp-api/src/sky-public-asset-headers.ts';
import {validateSkyStaticBundle} from '../../../../tools/deployment/sky-static-bundle.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const OUT=path.join(ROOT,'output/science-standard-static-1003-r1');
const sha=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const bind=(file:string)=>{const bytes=fs.readFileSync(file);return {path:path.relative(ROOT,file).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)}};
const publications=[
 {directory:'output/sdss-science-optical-writer-1002-r1/publication',pin:'34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0',sha:'3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5'},
 {directory:'output/signed-science-publication-1003-r1',pin:'dddc454058cd1dc464ab0f726b78d0af5df130d4a6c51c41d8a83e4bfcf5e2af',sha:'d64d9534d74457b9ea48f1dfd67cb46727e5040a6c2ccf3c79a58e13143c7572'},
];
const preparedDirectory=path.join(ROOT,'output/prepared-optical-publication-1003-r4/publication');
const preparedPin='8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802';
const preparedManifest=path.join(preparedDirectory,'manifest.json');
assert.equal(bind(preparedManifest).sha256,'23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1');
const previousIndex=path.join(ROOT,'output/prepared-static-egress-1003-r1/standard-export/publication/index.json');
assert.equal(bind(previousIndex).sha256,'7bba733647d4170d60fda6205843c45955767b783cea820242dcc5ae28680488');
const previous=JSON.parse(fs.readFileSync(previousIndex,'utf8'));
const files=[fileURLToPath(import.meta.url),preparedManifest,previousIndex];
const descriptors=publications.map(row=>{
 const file=path.join(ROOT,row.directory,'manifest.json');assert.equal(bind(file).sha256,row.sha);files.push(file);
 const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const asset of Object.values(manifest.levels) as any[]){const image=path.join(ROOT,row.directory,asset.file);
  assert.equal(bind(image).sha256,asset.sha256);files.push(image);}
 return {reference:'M:51',expectedHash:row.pin,manifestUrl:pathToFileURL(file)};
});
const protectedRows=JSON.parse(fs.readFileSync(path.join(ROOT,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const row of protectedRows){const file=path.join(ROOT,row.path);assert.equal(bind(file).sha256,row.sha256);files.push(file);}
for(const file of ['workers/miniapp-api/src/sdss-optical-imagery.ts','workers/miniapp-api/src/sky-public-asset-export.ts',
 'workers/miniapp-api/src/sky-public-asset-headers.ts','workers/miniapp-api/src/target-optical-image-file.ts',
 'tools/deployment/sky-static-bundle.mjs','infrastructure/deployment/sky-resource-logging.caddy'])files.push(path.join(ROOT,file));
const before=files.map(bind);fs.mkdirSync(OUT);
const prepared=new PreparedOpticalImageryService([{reference:'M:51',expectedHash:preparedPin,manifestUrl:pathToFileURL(preparedManifest)}]);
const sdss=new SdssOpticalImageryService({sciencePublications:descriptors});
const exported=await exportSkyPublicAssets(path.join(OUT,'standard-export'),'72e65cf309d700cb7d40c5b7afd53660fd39fa35',prepared,sdss);
const index=await validateSkyStaticBundle(exported.output);
const records=index.records;assert.equal(records.length,previous.records.length+6);
const current=new Map(records.map((row:any)=>[row.route,row]));
for(const row of previous.records)assert.deepEqual(current.get(row.route),row,'all old routes retain exact headers/hash/bytes');
const added=records.filter((row:any)=>publications.some(p=>row.route.startsWith(`/v2/sky/sdss-optical/${p.pin}/`)));
assert.equal(added.length,6);let addedBytes=0;
for(const row of added){
 const image=await sdss.getByFile(row.route.split('/').at(-2),row.route.split('/').at(-1));
 assert.equal(row.sha256,sha(image.bytes));assert.equal(row.bytes,image.bytes.length);
 assert.deepEqual(row.headers,skyPublicAssetHeaders('sdss-optical','image/png',image.fieldDegrees));
 assert.equal(bind(path.join(exported.output,'files',row.route)).sha256,row.sha256);addedBytes+=row.bytes;
}
assert.equal(records.some((row:any)=>row.route.includes('sdss-optical')&&/manifest|\.npy|receipt|binding|\.fits/u.test(row.route)),false);
const fragment=fs.readFileSync(path.join(exported.output,'delivery.caddy'),'utf8');
for(const row of added)assert(fragment.includes(row.route));
const classification=fs.readFileSync(path.join(ROOT,'infrastructure/deployment/sky-resource-logging.caddy'),'utf8');
assert(classification.includes('@sky_optical_published path /v2/sky/sdss-optical/* /v2/sky/prepared-optical/*'));
const sourceFile=path.join(ROOT,'workers/miniapp-api/src/sky-public-asset-export.ts');
const source=ts.createSourceFile(sourceFile,fs.readFileSync(sourceFile,'utf8'),ts.ScriptTarget.Latest,true);
const declaration=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==='exportSkyPublicAssets')!.getText(source).replace(/^export\s+/u,'');
const needle='approvedSkyPublicAssets(prepared, sdss)';assert.equal(declaration.split(needle).length,2);
const mutated=declaration.replace(needle,'approvedSkyPublicAssets(prepared)');
const mutant=vm.runInNewContext(ts.transpileModule(mutated,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nexportSkyPublicAssets;',{
 approvedSkyPublicAssets,writeSkyStaticBundle:async(_directory:string,assets:AsyncIterable<any>)=>{
  const optical=[];for await(const asset of assets)if(asset.route.startsWith('/v2/sky/sdss-optical/'))optical.push(asset.route);
  return {optical}; // Observe enumeration only; no second export or payload writes.
 }
});
const omitted=await mutant('no-output',undefined,prepared,sdss);assert.equal(omitted.optical.length,18);
assert(!omitted.optical.some((route:string)=>publications.some(row=>route.includes(row.pin))));
const after=files.map(bind);assert.deepEqual(after,before);
const result={status:'CURRENT_STANDARD_EXPORT_DEVELOPMENT_NOT_ADOPTED',publicationHash:exported.publicationHash,
 output:exported.output,routeCount:records.length,totalPayloadBytes:records.reduce((sum:number,row:any)=>sum+row.bytes,0),
 preservedOldRoutes:previous.records.length,explicitScienceRoutes:added,addedPayloadBytes:addedBytes,
 boundedMutation:{droppedExplicitOwner:true,opticalRoutes:omitted.optical.length,newScienceRoutes:0,payloadFilesWritten:0},
 classification:'existing optical_published path matcher; no new Caddy HTTP/accounting run',
 artifact:bind(path.join(exported.output,'image-artifact.json')),index:bind(path.join(exported.output,'index.json')),
 fragment:bind(path.join(exported.output,'delivery.caddy')),inputsBefore:before,inputsAfter:after,
 scope:'Actual sealed standard exporter and real v2/v3 PNGs. No default registry/adoption, network, new latency/capacity/physical-allocation claim or independent/native/quality acceptance.'};
fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:bind(path.join(OUT,'result.json')),routeCount:records.length,totalPayloadBytes:result.totalPayloadBytes,
 preservedOldRoutes:previous.records.length,addedPayloadBytes:addedBytes,publicationHash:exported.publicationHash}));
