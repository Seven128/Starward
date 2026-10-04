/** Local-only PS1 HiPS publication probe. Never use this bounded tile as a
 * production dataset or copy the generated artifacts into a release. */
import "reflect-metadata";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {copyFile,mkdir,readFile,writeFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {Module} from "@nestjs/common";
import {NestFactory} from "@nestjs/core";
import {FastifyAdapter,type NestFastifyApplication} from "@nestjs/platform-fastify";
import {pix2VecNest} from "healpix-ts";
import {OBSERVATION_FRAME_FORMAT} from "@starward/miniapp-contracts";
import {assertOpticalHipsManifest,assertOpticalHipsIndex} from "../../../apps/wechat-miniapp/src/services/optical-hips-publication.ts";
import {selectPublishedOpticalTiles} from "../../../apps/wechat-miniapp/src/features/sky/sky-optical-tile-selection.ts";
import {skyJpegDimensions} from "../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts";
import {MiniappController} from "../../../workers/miniapp-api/src/controller.ts";
import {MiniappService} from "../../../workers/miniapp-api/src/miniapp-service.ts";
import {OpticalHipsPublicationService} from "../../../workers/miniapp-api/src/optical-hips-publication.ts";
import {createTestMiniappService} from "../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts";

const repository=resolve(dirname(fileURLToPath(import.meta.url)),"../../..");
const source=join(repository,"artifacts/miniapp/cloud-sky-native/optical-hips-ps1-m31-order8.jpg");
const destination=join(repository,"artifacts/miniapp/cloud-sky-native/optical-local-trial");
const directory=join(destination,"ps1-dr1/Norder8/Dir40000");
const sha=(data:Uint8Array)=>createHash("sha256").update(data).digest("hex");
const image=await readFile(source);
assert.ok(image.length>100_000 && image[0]===0xff && image[1]===0xd8 &&
  image.at(-2)===0xff && image.at(-1)===0xd9,"original trial JPEG unavailable");
await mkdir(directory,{recursive:true});
await copyFile(source,join(directory,"Npix43345.jpg"));
const shard={schemaVersion:"starward-optical-hips-shard-v1",sourceId:"ps1-dr1",order:8,dir:40000,
  tiles:[{pixel:43345,sha256:sha(image),bytes:image.length}]};
const shardBytes=Buffer.from(JSON.stringify(shard));
await writeFile(join(directory,"index.json"),shardBytes);
const root={schemaVersion:"starward-optical-hips-v1",publicationId:"local-ps1-m31-one-tile",
  scope:"TRIAL",processing:"Unmodified CDS PS1 HiPS sample for local native rendering only",
  limitations:["One actual M31 tile; no mosaic, full-sky coverage or redistribution clearance"],
  sources:[{id:"ps1-dr1",title:"PanSTARRS DR1 color (i, r, g)",provider:"CDS / PS1 Science Consortium",
    originalDataUrl:"https://outerspace.stsci.edu/spaces/PANSTARRS/overview",
    originalRights:"MAST data-use policy; product redistribution review remains open",
    originalRightsUrl:"https://archive.stsci.edu/publishing/data-use",
    hipsRecordUrl:"https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FPanSTARRS%2FDR1%2Fcolor-i-r-g",
    hipsLicense:"ODbL-1.0",hipsDoi:"10.26093/cds/aladin/598a-0e",format:"jpeg",tileWidth:512,maxOrder:11}],
  shards:[{sourceId:"ps1-dr1",order:8,dir:40000,file:"ps1-dr1/Norder8/Dir40000/index.json",
    sha256:sha(shardBytes),bytes:shardBytes.length,tileCount:1}]};
const manifestPath=join(destination,"manifest.json");
await writeFile(manifestPath,JSON.stringify(root));
const service=new OpticalHipsPublicationService(pathToFileURL(manifestPath));
const publication=service.manifest();
const index=await service.index(publication.publicationHash,"ps1-dr1",8,40000);
const served=await service.tile(publication.publicationHash,"ps1-dr1",8,43345);
assert.deepEqual(served.bytes,image);
assert.equal(index.tiles[0]?.sha256,sha(image));
class TestModule {}
Module({controllers:[MiniappController],providers:[{provide:MiniappService,
  useValue:createTestMiniappService({opticalHips:service})}]})(TestModule);
const app=await NestFactory.create<NestFastifyApplication>(TestModule,new FastifyAdapter(),{logger:false});
try {
  await app.init();
  const http=app.getHttpAdapter().getInstance();
  const rootResponse=await http.inject({method:"GET",url:"/v2/sky/optical/manifest"});
  assert.equal(rootResponse.statusCode,200);
  const published=rootResponse.json();
  assertOpticalHipsManifest(published);
  assert.equal(published.publicationHash,publication.publicationHash);
  const shardResponse=await http.inject({method:"GET",url:published.shards[0].indexUrl});
  assert.equal(shardResponse.statusCode,200);
  const publishedIndex=shardResponse.json();
  assertOpticalHipsIndex(publishedIndex,published,"ps1-dr1",8,40000);
  const forward=pix2VecNest(256,43345),horizontal=Math.hypot(forward[0],forward[1]);
  const selected=selectPublishedOpticalTiles(published,{
    format:OBSERVATION_FRAME_FORMAT,at:"2026-09-23T00:00:00.000Z",
    observer:{latitude:0,longitude:0,elevationM:0},
    equatorialToEnu:[1,0,0,0,1,0,0,0,1]},
    {basis:{forward,right:[forward[1]/horizontal,-forward[0]/horizontal,0],
      up:[-forward[2]*forward[0]/horizontal,-forward[2]*forward[1]/horizontal,horizontal]},
      verticalFovDeg:.25},390,844);
  assert.ok(selected?.pixels.includes(43345));
  const tileResponse=await http.inject({method:"GET",url:publishedIndex.tiles[0].downloadUrl});
  assert.equal(tileResponse.statusCode,200);
  assert.deepEqual(tileResponse.rawPayload,image);
  assert.deepEqual(skyJpegDimensions(tileResponse.rawPayload),{width:512,height:512});
} finally {await app.close();}
process.stdout.write(JSON.stringify({manifestPath,publicationHash:publication.publicationHash,
  scope:publication.scope,httpStatus:200,selectedPixel:43345,sourceId:index.sourceId,pixel:index.tiles[0]?.pixel,
  bytes:served.bytes.length,sha256:sha(served.bytes)})+"\n");
