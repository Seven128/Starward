import assert from "node:assert/strict";
import test from "node:test";
import {skyFixedImageStatus} from "./sky-fixed-image-status";

test("a failed source refresh retains a decoded Moon, Mars or Galactic image instead of claiming fallback",()=>{
  const decoded={width:1024,height:512};
  assert.deepEqual(skyFixedImageStatus(true,decoded,false,true,false),
    {failed:false,refreshFailed:true});
  assert.deepEqual(skyFixedImageStatus(true,null,false,true,false),
    {failed:true,refreshFailed:false});
  assert.deepEqual(skyFixedImageStatus(true,null,false,false,true),
    {failed:true,refreshFailed:false});
  assert.deepEqual(skyFixedImageStatus(false,null,true,true,true),
    {failed:false,refreshFailed:false});
});
