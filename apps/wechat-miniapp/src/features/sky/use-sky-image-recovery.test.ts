import assert from 'node:assert/strict';
import test from 'node:test';
import {skyImageRecoveryTestOwner} from './sky-image-recovery-test-support';

test('current recovery keeps GPU meaning and latest callbacks, but cannot restart disabled or unmounted work',()=>{
  const owner=skyImageRecoveryTestOwner();let images=0,metadata=0,oldMetadata=0;
  const first=owner.useSkyImageRecovery(true,()=>{images++;return true;},()=>{oldMetadata++;});
  assert.equal(first(),true);assert.equal(images,1);assert.equal(oldMetadata,1);
  owner.useSkyImageRecovery(false,()=>{images++;return true;},()=>{metadata++;});
  assert.equal(first(),false);assert.equal(images,1);assert.equal(metadata,0);
  const latest=owner.useSkyImageRecovery(true,()=>{images++;return false;},()=>{metadata++;});
  assert.equal(first(),false);assert.equal(images,2);assert.equal(metadata,1);assert.equal(oldMetadata,1);
  owner.dispose();assert.equal(first(),false);assert.equal(latest(),false);
  assert.equal(images,2);assert.equal(metadata,1);
});
