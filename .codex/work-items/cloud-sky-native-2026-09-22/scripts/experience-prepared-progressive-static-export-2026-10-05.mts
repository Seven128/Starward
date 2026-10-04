/** Actual v1/v2 PNGs through the existing sealed exporter, without deployment. */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PreparedOpticalImageryService} from '../../../../workers/miniapp-api/src/prepared-optical-imagery.ts';
import {exportSkyPublicAssets} from '../../../../workers/miniapp-api/src/sky-public-asset-export.ts';
import {skyPublicAssetHeaders} from '../../../../workers/miniapp-api/src/sky-public-asset-headers.ts';
import {validateSkyStaticBundle} from '../../../../tools/deployment/sky-static-bundle.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.join(root,'output/prepared-progressive-static-check-1005-r1');
await fs.mkdir(out,{recursive:false});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'));
const save=(name:string,value:unknown)=>fs.writeFile(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const hash=(raw:Uint8Array)=>createHash('sha256').update(raw).digest('hex');
const bind=async(relative:string)=>{const raw=await fs.readFile(path.join(root,relative));return {path:relative,bytes:raw.length,sha256:hash(raw)};};
try{
 const publications=['output/hubble-m82-prepared-publication-1004-r2/manifest.json','output/prepared-progressive-publication-1005-r1/manifest.json'];
 const pins=await Promise.all(publications.map(bind));
 const manifests=await Promise.all(publications.map(async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'))));
 const owner=new PreparedOpticalImageryService(manifests.map((m,i)=>({reference:'M:82',expectedHash:m.publicationHash,manifestUrl:pathToFileURL(path.join(root,publications[i]!))})));
 for(const m of manifests)assert.equal(new PreparedOpticalImageryService().hasRegisteredPublicationHash(m.publicationHash),false);
 // Current uncommitted implementation is not mislabeled as a trusted OCI
 // build of HEAD: omit the optional deployment image-artifact/revision.
 const result=await exportSkyPublicAssets(path.join(root,'output/prepared-progressive-static-1005-r1'),undefined,owner);
 const sealed=await validateSkyStaticBundle(result.output);
 const rows=sealed.records.filter((row:any)=>row.route.startsWith('/v2/sky/prepared-optical/'));
 assert.equal(rows.length,6);
 const checks=[];
 for(const m of manifests)for(const level of ['OVERVIEW','MEDIUM','DETAIL']){
  const a=m.levels[level],row=rows.find((r:any)=>r.route===a.downloadUrl);assert(row);
  const bytes=await fs.readFile(path.join(result.output,'files',row.route));
  assert.equal(bytes.length,a.bytes);assert.equal(hash(bytes),a.sha256);
  const current=await owner.getByFile(m.publicationHash,a.file);
  assert.deepEqual(current.bytes,bytes);assert.equal(current.pixelSize,a.pixels);
  assert.deepEqual(row.headers,skyPublicAssetHeaders('prepared-optical',current.contentType,a.fieldDegrees));
  checks.push({version:m.imageVersion,hash:m.publicationHash,level,pixels:a.pixels,route:row.route,bytes:bytes.length,sha256:hash(bytes),headers:row.headers});
 }
 assert.equal(rows.some((r:any)=>/manifest|master|receipt|xmp|jpeg/i.test(r.route)),false);
 assert.deepEqual(await Promise.all(publications.map(bind)),pins);
 await save('result.json',{status:'CURRENT_REAL_V1_V2_STANDARD_STATIC_EXPORT_BYTE_HEADER_COMPATIBILITY',
  sourcePublications:pins,export:result,sealed:{files:sealed.files,bytes:sealed.bytes,publicationHash:sealed.publicationHash},prepared:checks,
  preparedBodyBytes:checks.reduce((sum,r)=>sum+r.bytes,0),newProfileBodyBytes:checks.filter(r=>r.version==='prepared-optical-v2').reduce((sum,r)=>sum+r.bytes,0),
  noImageArtifactOrDeployment:true,ordinaryRegistryAdopted:false,
  limits:'Actual existing sealed standard exporter includes both immutable versions and all normally approved Sky families. Byte/header readback is not Caddy static HTTP/TLS/public-wire exit, full-machine retention/capacity, licensing/quality adoption, independent review or native acceptance. No source processing, purchase, remote deployment or release.'});
 console.log(JSON.stringify({status:'CURRENT_REAL_V1_V2_STANDARD_STATIC_EXPORT_BYTE_HEADER_COMPATIBILITY',preparedFiles:checks.length,preparedBytes:checks.reduce((sum,r)=>sum+r.bytes,0),totalSealedBytes:sealed.bytes}));
}catch(error){await save('failed.json',{error:String(error)});throw error;}
