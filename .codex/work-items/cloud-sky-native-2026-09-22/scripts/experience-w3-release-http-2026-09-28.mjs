// Fresh compiled production exports, real loopback HTTP, no shared API restart.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
process.env.MINIAPP_RELEASE_PROFILE="LOCAL";
process.env.MINIAPP_STORAGE_MODE="MEMORY_TEST";
process.env.MINIAPP_AUTH_MODE="LOCAL_TEST";
process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE="0";
process.env.NODE_ENV="test"; // explicitly authorize the isolated in-memory runtime
delete process.env.MINIAPP_OPTICAL_HIPS_TRIAL_MANIFEST;
await import("reflect-metadata");
const {NestFactory}=await import("@nestjs/core");
const {FastifyAdapter}=await import("@nestjs/platform-fastify");
const {AppModule}=await import("../../../../workers/miniapp-api/dist/app.module.js");
const {ApiExceptionFilter}=await import("../../../../workers/miniapp-api/dist/api-exception.filter.js");
const app=await NestFactory.create(AppModule,new FastifyAdapter(),{logger:false,abortOnError:false}).catch(error=>{
 // Do not print an environment validation message that might include values.
 console.error(JSON.stringify({bootstrapError:error.name,stackFrames:String(error.stack).split("\n").slice(1,4)}));
 process.exit(1);
});
app.useGlobalFilters(new ApiExceptionFilter());
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
try{
 await app.listen(0,"127.0.0.1");const base=await app.getUrl();
 const request=async route=>{const result=await fetch(base+route,{signal:AbortSignal.timeout(5000)});assert.equal(result.status,200,route);return result;};
 const object=await (await request("/v2/celestial-objects/M%3A31")).json();
 const source=object.data.sources.find(value=>value.id.startsWith("imagery:"));assert.ok(source);
 assert.ok(source.limitations.some(value=>value.includes("未测量源数据有效覆盖比例")));
 const hash=source.id.split(":").at(-1),manifestResponse=await request(`/v2/sky/deep-sky/${hash}/manifest`);
 const manifestRaw=await manifestResponse.text(),publication=JSON.parse(manifestRaw);
 assert.equal(publication.schemaVersion,"allwise-w3-deep-sky-publication-v2");
 assert.equal(publication.entryCount,51);
 assert.ok(publication.entries.every(entry=>Object.values(entry.levels).every(asset=>asset.validFraction===null&&asset.coverageState==="NOT_MEASURED")));
 const previousHash=publication.previousPublicationHash,previous=await (await request(`/v2/sky/deep-sky/${previousHash}/manifest`)).json();
 assert.equal(previous.schemaVersion,"allwise-w3-deep-sky-publication-v1");
 const images=[];
 for(const reference of ["M:31","M:42","M:101"]){
  const currentAsset=publication.entries.find(value=>value.objectRef===reference).levels.DETAIL;
  const priorAsset=previous.entries.find(value=>value.objectRef===reference).levels.DETAIL;
  const response=await request(currentAsset.downloadUrl),bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.length,currentAsset.bytes);assert.equal(digest(bytes),currentAsset.sha256);
  assert.equal(response.headers.get("content-type"),"image/jpeg");
  const priorBytes=Buffer.from(await (await request(priorAsset.downloadUrl)).arrayBuffer());assert.deepEqual(priorBytes,bytes);
  images.push({reference,bytes:bytes.length,sha256:digest(bytes),currentAndPriorPixelsIdentical:true,
   fieldDegrees:Number(response.headers.get("x-starward-image-field-degrees")),cacheControl:response.headers.get("cache-control")});
 }
 const missing="0".repeat(64);
 assert.equal((await fetch(base+`/v2/sky/deep-sky/${missing}/manifest`)).status,404);
 assert.equal((await fetch(base+`/v2/celestial-objects/M%3A31/image?publicationHash=${missing}`)).status,404);
 const moon=await (await request("/v2/sky/moon/coverage/manifest")).json();
 const moonAsset=moon.image??moon.data?.image;assert.ok(moonAsset);
 const moonBytes=Buffer.from(await (await request(moonAsset.downloadUrl)).arrayBuffer());
 assert.equal(moonBytes.length,1595187);assert.equal(digest(moonBytes),moonAsset.sha256);
 const sdss=await (await request("/v2/sky/sdss-optical/manifest")).json();assert.equal(sdss.objectRef,"M:51");
 const result={scope:"Fresh compiled production exports on real ephemeral loopback Nest/Fastify HTTP; explicit NODE_ENV=test LOCAL/MEMORY_TEST runtime, fixture mode off; not shared 8787, phone or cloud delivery",
  current:{schema:publication.schemaVersion,hash,entries:publication.entryCount,images:153,manifestResponseBytes:Buffer.byteLength(manifestRaw),coverage:"NOT_MEASURED"},
  previous:{schema:previous.schemaVersion,hash:previousHash},images,
  moonCoverage:{bytes:moonBytes.length,sha256:digest(moonBytes)},sdssIdentity:"M:51",missingVersions404:true};
 await writeFile(new URL("../evidence/experience-w3-release-http-2026-09-28.json",import.meta.url),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
 console.log(JSON.stringify(result));
}finally{await app.close();}
