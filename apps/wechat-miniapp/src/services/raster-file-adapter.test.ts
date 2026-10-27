import assert from "node:assert/strict";
import test from "node:test";
import { createRasterFileAdapter, type RasterFilePlatform } from "./raster-file-adapter.ts";
import { isMiniappRequestCancelled } from './request-lifecycle';

function platform() {
  let callbacks!: Parameters<RasterFilePlatform["download"]>[0];
  let progress!: (value: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void;
  let aborts = 0, failStat = false, requestedSha = false;
  const driver: RasterFilePlatform = {
    allocatePath: () => "/owned/destination",
    recover: async () => [],
    download: options => { callbacks = options; return { abort: () => { aborts++; }, onProgressUpdate: callback => { progress = callback; } }; },
    stat: async (_path, hash) => { requestedSha = hash; if (failStat) throw new Error("stat failed"); return { size: 3, digest: "a".repeat(64) }; },
    remove: async () => undefined,
  };
  return { driver, get callbacks() { return callbacks; }, get aborts() { return aborts; }, get requestedSha() { return requestedSha; },
    failStat: () => { failStat = true; }, progress: (bytes: number) => progress({ totalBytesWritten: bytes, totalBytesExpectedToWrite: bytes }) };
}

for(const cancelled of [true,false])test(`callback and Promise download failure settle once (${cancelled?'cancelled':'transport'})`,async()=>{
  const p=platform(),controller=new AbortController();
  let rejectNative!:(error:unknown)=>void,callbacks!:Parameters<RasterFilePlatform['download']>[0],handled=false;
  const cause={errMsg:cancelled?'downloadFile:fail abort':'downloadFile:fail private-url',errno:600005};
  const native=Object.assign(new Promise<never>((_resolve,reject)=>{rejectNative=reject;}),{
    abort(){callbacks.fail(cause);rejectNative(cause);},onProgressUpdate(){},
  });
  const nativeCatch=native.catch.bind(native);
  native.catch=(...args)=>{handled=true;return nativeCatch(...args);};
  p.driver.download=options=>{callbacks=options;return native;};
  const read=createRasterFileAdapter(p.driver,path=>path).download({key:'a',url:'/v2/terrain/assets/a.png'},controller.signal,10);

  // Keep the intentionally failing pre-fix check from polluting the host's
  // unhandled-rejection queue; it must still assert the missing product owner.
  if(!handled)void nativeCatch(()=>undefined);
  if(cancelled)controller.abort();else {callbacks.fail(cause);rejectNative(cause);}
  const result=await read;
  assert.equal(result.path,'/owned/destination','a failed transfer retains its possible partial destination');
  const error=result.integrityError!;
  assert(cancelled?isMiniappRequestCancelled(error):error.message==='raster_image_download_failed'&&error.cause===cause);
  assert.equal(handled,true,'the Taro task Promise has a rejection owner as well as its callbacks');
});

test("raster transport asks the native filesystem for the image's SHA-256 and preserves its byte result", async () => {
  const p = platform(), adapter = createRasterFileAdapter(p.driver, path => `https://owned.invalid${path}`);
  const result = adapter.download({ key: "a", url: "/v2/terrain/assets/a.png", expectedSha256: "a".repeat(64) }, new AbortController().signal, 10);
  assert.equal(p.callbacks.timeout, 18000);
  assert.equal(p.callbacks.filePath,"/owned/destination");
  p.callbacks.success({ statusCode: 200, filePath: p.callbacks.filePath, tempFilePath: "" });
  assert.deepEqual(await result, { path: "/owned/destination", bytes: 3, sha256: "a".repeat(64) }); assert.equal(p.requestedSha, true);
});

test("a successful but cancelled or unstatable destination still returns disposal ownership", async () => {
  const p = platform(), controller = new AbortController(), adapter = createRasterFileAdapter(p.driver, path => path);
  const result = adapter.download({ key: "a", url: "/v2/terrain/assets/a.png" }, controller.signal, 10);
  controller.abort(); assert.equal(p.aborts, 1); p.failStat();
  p.callbacks.success({ statusCode: 200, tempFilePath: "/owned/late" });
  const file = await result; assert.equal(file.path, "/owned/destination"); assert.equal(file.bytes, 10);
  assert.match(file.integrityError!.message, /stat_failed/);
});

test("oversized native download progress aborts the transfer and reports its real failure", async () => {
  const p = platform(), adapter = createRasterFileAdapter(p.driver, path => path);
  const result = adapter.download({ key: "a", url: "/v2/terrain/assets/a.png" }, new AbortController().signal, 10);
  p.progress(11); assert.equal(p.aborts, 1); p.callbacks.fail({ errMsg: "downloadFile:fail abort" });
  assert.match((await result).integrityError!.message,/download_too_large/);
});

test('transport and stat failures retain numeric native causes without copying their private messages',async()=>{
  const p=platform(),adapter=createRasterFileAdapter(p.driver,path=>path);
  const read=adapter.download({key:'a',url:'/v2/terrain/assets/a.png'},new AbortController().signal,10);
  const cause={errno:600002,errMsg:'downloadFile:fail private-url'};
  p.callbacks.fail(cause);
  const failed=await read;
  assert.equal(failed.integrityError?.message,'raster_image_download_failed');
  assert.equal(failed.integrityError?.cause,cause);
  const statCause={errCode:700001,errMsg:'private-file'};
  p.driver.stat=async()=>{throw statCause;};
  const stat=adapter.download({key:'a',url:'/v2/terrain/assets/a.png'},new AbortController().signal,10);
  p.callbacks.success({statusCode:200,tempFilePath:'/owned/stat-failed'});
  const file=await stat;
  assert.equal(file.path,'/owned/destination','cleanup still owns the downloaded file');
  assert.equal(file.integrityError?.cause,statCause);
  assert.equal(file.integrityError?.message,'raster_image_file_stat_failed');
});

test('known HTTP failure survives a missing file and failed stat without losing destination ownership',async()=>{
  const p=platform(),adapter=createRasterFileAdapter(p.driver,path=>path);
  const missing=adapter.download({key:'a',url:'/v2/terrain/assets/a.png'},new AbortController().signal,10);
  p.callbacks.success({statusCode:503,tempFilePath:''});
  assert.equal((await missing).integrityError?.message,'raster_image_download_failed:503');
  const cause={errno:600007,errMsg:'private-path'};
  p.driver.stat=async()=>{throw cause;};
  const stat=adapter.download({key:'a',url:'/v2/terrain/assets/a.png'},new AbortController().signal,10);
  p.callbacks.success({statusCode:503,tempFilePath:'/owned/http-failed'});
  const file=await stat;
  assert.equal(file.path,'/owned/destination');assert.equal(file.bytes,10);
  assert.equal(file.integrityError?.message,'raster_image_download_failed:503');
  assert.equal(file.integrityError?.cause,cause,'numeric stat failure remains available as secondary evidence');
});
