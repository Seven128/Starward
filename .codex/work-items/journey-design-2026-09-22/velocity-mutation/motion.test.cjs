const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./motion.js');
const m=globalThis.StarwardElasticSheet,stops={small:156,medium:368,large:687};
test('bounds resist progressively in both directions instead of hard clamping',()=>{
 assert.equal(m.rubber(400,156,687),400);
 for(const sign of [-1,1]){
  const edge=sign<0?156:687;
  const a=Math.abs(m.rubber(edge+sign*80,156,687)-edge);
  const b=Math.abs(m.rubber(edge+sign*160,156,687)-edge);
  assert.ok(a>0&&a<80&&b>a&&b-a<a&&b<72);
 }
});
test('same release location selects different anchors based on recent velocity',()=>{
 assert.equal(m.snap(stops,400,0,'medium'),'medium');
 assert.equal(m.snap(stops,400,1.2,'medium'),'large');
 assert.equal(m.snap(stops,400,-1.2,'medium'),'small');
 const samples=[{y:300,t:0},{y:270,t:30},{y:200,t:80}];
 assert.equal(m.velocity(samples,90),1.25);
 assert.equal(m.velocity(samples,160),0);
});
test('spring starts from the live stretched height and settles at the anchor',()=>{
 assert.equal(m.spring(735,687,-.4,0).height,735);
 const end=m.spring(735,687,-.4,650);
 assert.ok(Math.abs(end.height-687)<.25&&Math.abs(end.speed)<.005);
 const moving=m.spring(368,687,1,55);
 assert.equal(m.spring(moving.height,156,moving.speed,0).height,moving.height);
});
test('regrabbing stretched surface preserves position and resisted release speed',()=>{
 const visual=100,raw=m.unRubber(visual,156,687);
 assert.ok(Math.abs(m.rubber(raw,156,687)-visual)<.001);
 const next=m.rubber(raw-6,156,687);
 assert.ok(next<visual&&visual-next<6);
 const v=-2*m.resistance(156-270,156,687);
 assert.ok(v<0&&v>-.2);
 const start=m.rubber(156-270,156,687),after=m.spring(start,156,v,16);
 assert.ok(after.height>start-4);
});
