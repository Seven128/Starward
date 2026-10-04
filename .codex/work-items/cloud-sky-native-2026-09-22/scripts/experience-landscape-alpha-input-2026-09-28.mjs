import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";

// A hash-bound input prototype, not a second plan or a deployed contract.
// The mask is exactly the PNG alpha; it is not terrain/sky validity inference.
const directory=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence/landscape-input-trial-2026-09-28/native");
const resultFile=path.join(directory,"alpha-input-result.json");
assert.ok(!await fs.access(resultFile).then(()=>true,()=>false),"preserve earlier input evidence");
const sourceFacts=JSON.parse(await fs.readFile(path.join(directory,"result-r4.json"),"utf8")).assetFacts;
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
function decode(publication,source){
  assert.equal(publication.schemaVersion,1);assert.equal(publication.encoding,"rows-rle-u8");
  assert.equal(publication.sourcePngSha256,source.sha256,"alpha is not transferable to another image");
  assert.equal(publication.width,source.width);assert.equal(publication.height,source.height);
  assert.equal(publication.rows.length,source.height);
  const output=new Uint8Array(source.width*source.height);
  for(let y=0;y<source.height;y++){
    let x=0;
    for(const run of publication.rows[y]){
      assert.ok(Array.isArray(run)&&run.length===2);
      const [value,length]=run;
      assert.ok(Number.isInteger(value)&&value>=0&&value<=255);
      assert.ok(Number.isInteger(length)&&length>0&&x+length<=source.width);
      output.fill(value,y*source.width+x,y*source.width+x+length);x+=length;
    }
    assert.equal(x,source.width,"partial rows cannot masquerade as clear sky");
  }
  return output;
}
const results=[];
for(const source of sourceFacts){
  const bytes=await fs.readFile(path.join(directory,source.filename));assert.equal(digest(bytes),source.sha256);
  const image=PNG.sync.read(bytes),alpha=new Uint8Array(image.width*image.height);
  for(let index=0;index<alpha.length;index++)alpha[index]=image.data[index*4+3];
  const rows=[];
  for(let y=0;y<image.height;y++){
    const runs=[];let start=0;
    while(start<image.width){const value=alpha[y*image.width+start];let end=start+1;while(end<image.width&&alpha[y*image.width+end]===value)end++;runs.push([value,end-start]);start=end;}
    rows.push(runs);
  }
  const publication={schemaVersion:1,encoding:"rows-rle-u8",width:image.width,height:image.height,sourcePngSha256:source.sha256,
    meaning:"Exact encoded PNG transparency for a generic simulated panorama, not selected-site obstruction or data validity",
    mapping:"image row zero at zenith; north registration is a separate simulated-scene parameter",
    sourceCredit:"Stara Lesna Meadows / Lubomir Hambalek; retain package CC BY 4.0 and registry BY-SA notices",rows};
  assert.deepEqual(decode(publication,source),alpha,"every source pixel is preserved");
  assert.throws(()=>decode(publication,{...source,sha256:"0".repeat(64)}),/alpha is not transferable/);
  const incomplete={...publication,rows:publication.rows.map(row=>row.map(run=>[...run]))};incomplete.rows[0][0][1]--;
  assert.throws(()=>decode(incomplete,source),/partial rows/);
  const changed={...publication,rows:publication.rows.map(row=>row.map(run=>[...run]))};changed.rows[0][0][0]=255;
  assert.notDeepEqual(decode(changed,source),alpha,"a plausible but wrong sky mask is detected");
  const filename=source.filename.replace(/\.png$/,".alpha-rle.json"),encoded=Buffer.from(JSON.stringify(publication)+"\n");
  await fs.writeFile(path.join(directory,filename),encoded,{flag:"wx"});
  results.push({sourcePngSha256:source.sha256,width:source.width,height:source.height,alphaBytes:alpha.length,
    alphaSha256:digest(alpha),maskFile:filename,encodedBytes:encoded.length,maskFileSha256:digest(encoded),
    roundtripPixels:alpha.length,staleIdentityRejected:true,partialRowRejected:true,wrongOpaqueSkyDetected:true});
}
await fs.writeFile(resultFile,JSON.stringify({scope:"Local hash-bound PNG-alpha publication input prototype; no runtime/visual/phone acceptance or service deployment",results},null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({inputMasks:results,independentOfSdkCanvasNode:true}));
