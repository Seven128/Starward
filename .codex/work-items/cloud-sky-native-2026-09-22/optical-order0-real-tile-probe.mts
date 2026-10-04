import 'reflect-metadata';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {FastifyAdapter,type NestFastifyApplication} from '@nestjs/platform-fastify';
import {MiniappController} from '../../../workers/miniapp-api/src/controller.ts';
import {MiniappService} from '../../../workers/miniapp-api/src/miniapp-service.ts';
import {OpticalHipsPublicationService} from '../../../workers/miniapp-api/src/optical-hips-publication.ts';
import {createTestMiniappService} from '../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts';
import {assertOpticalHipsManifest,assertOpticalHipsIndex} from '../../../apps/wechat-miniapp/src/services/optical-hips-publication.ts';
import {publishedOpticalCoverageComplete,resolvePublishedOpticalTiles,selectPublishedOpticalCandidates} from '../../../apps/wechat-miniapp/src/features/sky/sky-optical-tile-selection.ts';
import {selectSkyHipsTiles} from '../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts';

const workspace=resolve(import.meta.dirname,'../../..');
const original=join(workspace,'artifacts/miniapp/cloud-sky-native/optical-hips-ps1-tile0.jpg');
const trial=join(workspace,'artifacts/miniapp/cloud-sky-native/optical-order0-trial');
const directory=join(trial,'ps1-dr1/Norder0/Dir0');
const tilePath=join(directory,'Npix0.jpg');
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
await mkdir(directory,{recursive:true});
await copyFile(original,tilePath);
const originalBytes=await readFile(original);
assert.equal(originalBytes[0],0xff);assert.equal(originalBytes[1],0xd8);
assert.equal(originalBytes.at(-2),0xff);assert.equal(originalBytes.at(-1),0xd9);
const shard={schemaVersion:'starward-optical-hips-shard-v1',sourceId:'ps1-dr1',order:0,dir:0,
  tiles:[{pixel:0,sha256:sha(originalBytes),bytes:originalBytes.length}]};
const shardBytes=Buffer.from(JSON.stringify(shard));
await writeFile(join(directory,'index.json'),shardBytes);
const manifest={schemaVersion:'starward-optical-hips-v1',publicationId:'local-real-ps1-order0-one-tile',
  scope:'TRIAL',processing:'Unmodified CDS PS1 order-0 sample; local integrity and projection probe only',
  limitations:['One historical optical tile only; no full-sky coverage, mosaic, quality or redistribution clearance'],
  sources:[{id:'ps1-dr1',title:'PanSTARRS DR1 color (i, r, g)',provider:'CDS / PS1 Science Consortium',
    originalDataUrl:'https://outerspace.stsci.edu/spaces/PANSTARRS/overview',
    originalRights:'MAST data-use policy; product redistribution review remains open',
    originalRightsUrl:'https://archive.stsci.edu/publishing/data-use',
    hipsRecordUrl:'https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FPanSTARRS%2FDR1%2Fcolor-i-r-g',
    hipsLicense:'ODbL-1.0',hipsDoi:'10.26093/cds/aladin/598a-0e',
    format:'jpeg',tileWidth:512,maxOrder:0}],
  shards:[{sourceId:'ps1-dr1',order:0,dir:0,file:'ps1-dr1/Norder0/Dir0/index.json',
    sha256:sha(shardBytes),bytes:shardBytes.length,tileCount:1}]};
const manifestPath=join(trial,'manifest.json');
await writeFile(manifestPath,JSON.stringify(manifest));
const publication=new OpticalHipsPublicationService(pathToFileURL(manifestPath));
const service=createTestMiniappService({opticalHips:publication});
class TestModule {}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,useValue:service}]})(TestModule);
const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
try{
  await app.init();
  const http=app.getHttpAdapter().getInstance();
  const rootResponse=await http.inject({method:'GET',url:'/v2/sky/optical/manifest'});
  assert.equal(rootResponse.statusCode,200);
  const root=rootResponse.json();assertOpticalHipsManifest(root);
  const indexResponse=await http.inject({method:'GET',url:root.shards[0].indexUrl});
  assert.equal(indexResponse.statusCode,200);
  const index=indexResponse.json();assertOpticalHipsIndex(index,root,'ps1-dr1',0,0);
  const tileResponse=await http.inject({method:'GET',url:index.tiles[0].downloadUrl});
  assert.equal(tileResponse.statusCode,200);
  assert.equal(tileResponse.headers['content-type'],'image/jpeg');
  assert.equal(sha(tileResponse.rawPayload),sha(originalBytes));
  const frame={equatorialToEnu:[1,0,0,0,1,0,0,0,1]} as never;
  const view={basis:{right:[1,0,0],up:[0,-1,0],forward:[0,0,1]},verticalFovDeg:267.8} as never;
  const candidates=selectPublishedOpticalCandidates(root,frame,view,390.4,844);
  const reference=selectSkyHipsTiles({frame,view,width:390.4,height:844,maxOrder:0,minOrder:0});
  assert.equal(reference.state,'SELECTED');
  if(reference.state!=='SELECTED')throw new Error('wide_reference_missing');
  const selected=resolvePublishedOpticalTiles(candidates,[index],reference);
  assert.deepEqual(selected.map(tile=>tile.pixel),[0]);
  assert.equal(publishedOpticalCoverageComplete(reference,selected),false);
  const missing=await http.inject({method:'GET',url:index.tiles[0].downloadUrl.replace(/\/0$/u,'/1')});
  assert.equal(missing.statusCode,404);
  console.log(JSON.stringify({scope:root.scope,publicationHash:root.publicationHash,
    source:'CDS PS1 order-0 sample',originalBytes:originalBytes.length,originalSha256:sha(originalBytes),
    manifestStatus:rootResponse.statusCode,indexStatus:indexResponse.statusCode,tileStatus:tileResponse.statusCode,
    missingStatus:missing.statusCode,referencePixels:reference.pixels,
    selectedPixels:selected.map(tile=>tile.pixel),coverageComplete:false,trialPath:trial},null,2));
}finally{await app.close();}
