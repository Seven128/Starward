import assert from "node:assert/strict";
import test from "node:test";
import {assertSkyStaticRecord,validSkyStaticRoute} from "./sky-static-bundle.mjs";

test("HiPS notice discovery stays mutable while the exported offer is bound to its own byte hash",()=>{
  const publication="a".repeat(64),offer="b".repeat(64),prefix=`/v2/sky/optical/${publication}/rights`;
  assert.equal(validSkyStaticRoute(prefix),false);
  const record={route:`${prefix}/${offer}`,sha256:offer,bytes:12,headers:{
    "content-type":"application/json; charset=utf-8","cache-control":"public, max-age=31536000, immutable",
    "x-content-type-options":"nosniff"}};
  assertSkyStaticRecord(record);
  assert.throws(()=>assertSkyStaticRecord({...record,sha256:publication}),/record_invalid/);
  assert.throws(()=>assertSkyStaticRecord({...record,route:`${prefix}/../${offer}`}),/record_invalid/);
  assert.throws(()=>assertSkyStaticRecord({...record,headers:{...record.headers,"content-type":"image/jpeg"}}),/header_invalid/);
});
