// Requirement check over the actual, frozen production rendering observation.
// Failure is the current defect, not a script/GL failure or new acceptance gate.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const result=JSON.parse(fs.readFileSync('output/playwright/cloud-sky-area-support-0930-final/result.json','utf8'));
assert.equal(result.errors.length,0);
assert.equal(result.source.sha256,'6976db0ae39a46c2ee8cd165c0a375a55c819d4248c715b064983184020cc0ba');
assert.equal(result.alpha.centerAlpha,0);
const rows=result.rows.filter(row=>row.fov===.05);
assert.equal(rows.length,3);
assert.equal(rows[0].rgbaSha256,rows[1].rgbaSha256,'the actual PNG has no pixel effect in this missing crop');
const wider=result.rows.filter(row=>row.fov===.8);
assert.notEqual(wider[0].rgbaSha256,wider[1].rgbaSha256,'valid source outside the crop must remain usable');
assert.equal(rows[0].claimedImage,false,'a zero-effect missing crop cannot establish a currently painted image');
assert.equal(rows[0].rgbaSha256,rows[2].rgbaSha256,'a missing crop must preserve the existing catalog identification cue');
