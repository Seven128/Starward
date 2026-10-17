import assert from "node:assert/strict";
import test from "node:test";
import {createSkyNameLayouts,pickSkyCatalogName,pickSkyControlName,sameSkyControlNames} from "./sky-name-layout";
import type {ResolvedSkyReport} from "./sky-stellar-scene";
import {skyReadyOpacity,skyReadyProgress} from "./sky-ready-presentation";
import {paintedSkyBoundsVisible,paintedSkyPointVisible} from "./sky-object-picking";
import {createSkyViewBasis} from "./sky-view-projection";
import {labelInteriorForeground} from "./sky-name-layout-test-support";
import {projectSkyCatalogNames} from "./sky-label-presentation";
const context={}, scope={context,mode:"NIGHT"};
const metrics={width:80,left:3,right:84,ascent:10,descent:9};
const name=(x:number,y=250,opacity=.5)=>({reference:"HR:8162",displayName:"Alderamin",kind:"STAR" as const,
  magnitude:2.45,x,y,auxiliaryOpacity:opacity});
const frame=(owner:ReturnType<typeof createSkyNameLayouts>,now:number,reduced=true)=>owner.prepare(scope,now,360,700,{top:80,bottom:70},reduced);
test("whole names center above their anchors and withdraw rather than squeeze or clamp at an edge",()=>{
  const owner=createSkyNameLayouts(),job=frame(owner,0),placed=job.catalog(name(180),metrics)!;
  assert(placed);assert.equal(placed.side,"above");assert.equal(placed.x,180);
  assert.equal(placed.caption.x,180);assert(placed.caption.y<placed.y);assert.equal(placed.caption.textAlign,"center");
  assert(placed.bounds.width>=metrics.left+metrics.right && placed.bounds.height>=44);
  assert.equal(placed.caption.text,"Alderamin");assert.equal(placed.caption.font,"12px sans-serif");
  assert.equal(job.catalog({...name(355),reference:'HR:2'},metrics),null,"no forced side label at the edge");
  assert.equal(job.catalog(name(180,90),metrics),null,"full hit area cannot overlap top controls");
  assert.equal(job.catalog(name(180),{...metrics,width:400,right:400}),null,"unfit whole text withdraws,never shrinks");
});

test("crossing the screen centre keeps the name above the live star without a side switch",()=>{
  const owner=createSkyNameLayouts();
  for(const [at,x] of [[0,170],[16,190],[32,250]] as const){
    const job=frame(owner,at),placed=job.catalog(name(x),metrics)!;
    assert(placed);assert.equal(placed.side,"above");assert.equal(placed.caption.x,x);assert.equal(placed.caption.y,226);assert(job.commit());
  }
  assert.equal(frame(owner,48).catalog(name(350),metrics),null);
});

test("late qualified names reveal to the current partial target after motion stops",()=>{
  const owner=createSkyNameLayouts(),first=frame(owner,1000,false);
  assert.equal(first.catalog(name(180),metrics)?.auxiliaryOpacity,0);assert(first.animating);assert(first.commit());
  const halfway=frame(owner,1080,false),half=halfway.catalog(name(180),metrics)!;
  assert.equal(half.auxiliaryOpacity,.25);assert(halfway.commit());
  const changed=frame(owner,1120,false),next=changed.catalog(name(180,250,.2),metrics)!;
  assert(Math.abs(next.auxiliaryOpacity-.15)<Number.EPSILON,"current .2 goal multiplies .75 readiness, never a full-bright first flash");
  assert(changed.commit());
  const settled=frame(owner,1160,false);assert.equal(settled.catalog(name(180,250,.2),metrics)?.auxiliaryOpacity,.2);
  assert(!settled.animating);
});
test("slow first copy does not spend the reveal before the name can be displayed",()=>{
  const owner=createSkyNameLayouts(),prepared=frame(owner,1000,false);
  assert.equal(prepared.catalog(name(180),metrics)?.auxiliaryOpacity,0);
  assert(prepared.commit(2000));
  const next=frame(owner,2080,false);assert.equal(next.catalog(name(180),metrics)?.auxiliaryOpacity,.25);
});
test("rejected paint/reset cannot advance the next display's readiness or retain hidden names",()=>{
  const owner=createSkyNameLayouts(),discarded=frame(owner,0,false);
  discarded.catalog(name(180),metrics);
  const replacement=frame(owner,100,false);assert.equal(replacement.catalog(name(180),metrics)?.auxiliaryOpacity,0);
  assert(replacement.commit());assert.equal(discarded.commit(),false);
  const hidden=frame(owner,200,false);assert(hidden.commit());
  const returning=frame(owner,300,false);assert.equal(returning.catalog(name(180),metrics)?.auxiliaryOpacity,0);
  owner.reset();assert.equal(returning.commit(),false);
});
test("same-copy whole-name picking uses current bounds and excludes invisible qualifications",()=>{
  const owner=createSkyNameLayouts(),first=frame(owner,0),placed=first.catalog(name(150),metrics)!;
  assert.equal(pickSkyCatalogName(first.names,placed.bounds.left+10,placed.bounds.top+10)?.reference,"HR:8162");
  assert.equal(pickSkyCatalogName(first.names,350,250),null);
  assert.equal(pickSkyCatalogName([{...placed,auxiliaryOpacity:.01}],placed.bounds.left+10,placed.bounds.top+10),null);
  const overlapping={...name(160),reference:"NGC:300",displayName:"NGC 300",kind:"GALAXY" as const};
  assert.equal(first.catalog(overlapping,metrics),null,"complete name rectangles cannot overlap");
});
test("the common readiness progress pauses and resumes independently of scale opacity",()=>{
  const start=skyReadyProgress(undefined,0),half=skyReadyProgress(start,80);
  const paused=skyReadyProgress(half,1000,false,true),resume=skyReadyProgress(paused,2000);
  assert.equal(resume.progress,.5);assert.equal(skyReadyOpacity(.5,resume),.25);
  assert.equal(skyReadyOpacity(.2,skyReadyProgress(resume,2080)),.2);
  assert.equal(skyReadyOpacity(.5,skyReadyProgress(undefined,0,true)),.5);
});

test("an opaque texel inside the above-name bounds withdraws the whole name without moving it sideways",()=>{
  const width=360,height=700,view={basis:createSkyViewBasis(0,135,0)!,verticalFovDeg:45};
  const mask=labelInteriorForeground(width,height,view,180,226),snapshot={width,height,view:{...view,landscape:mask}};
  assert(paintedSkyPointVisible(snapshot,180,250));assert(!paintedSkyPointVisible(snapshot,180,226));
  const job=frame(createSkyNameLayouts(),0);
  assert.equal(job.catalog(name(180),metrics,bounds=>paintedSkyBoundsVisible(snapshot,bounds)),null);
  assert.equal(job.names.length,0);
});

test("a clear whole word retains its accepted side when opaque source pixels lie below its rectangle",()=>{
  const width=360,height=700,view={basis:createSkyViewBasis(0,135,0)!,verticalFovDeg:45};
  const mask=labelInteriorForeground(width,height,view,224,305),snapshot={width,height,view:{...view,landscape:mask}};
  const owner=createSkyNameLayouts(),first=frame(owner,0),before=first.catalog(name(180),metrics)!;
  assert.equal(before.side,'above');assert(first.commit());
  for(let y=0;y<=8;y++)for(let x=0;x<=16;x++)assert(paintedSkyPointVisible(snapshot,
    before.bounds.left+x*before.bounds.width/16,before.bounds.top+y*before.bounds.height/8));
  const next=frame(owner,16),placed=next.catalog(name(180),metrics,bounds=>paintedSkyBoundsVisible(snapshot,bounds));
  assert(placed);assert.equal(placed.side,'above','a nearby foreground patch cannot move a clear whole name');
});

test("constellation whole-glyph avoidance shares the accepted rectangles and keeps its neighbouring offset stable",()=>{
  const owner=createSkyNameLayouts(),first=frame(owner,0),catalog=first.catalog(name(180),metrics)!;
  const caption={text:'仙王座',x:240,y:250,opacity:.6,textAlign:'center' as const,letterSpacing:1};
  const glyphs={width:38,left:0,right:38,ascent:9,descent:9};
  const placed=first.constellation('Cep',caption,glyphs)!;
  assert(placed);assert.equal(placed.text,caption.text);assert.equal(placed.x,caption.x);assert.equal(placed.y,178);
  assert.equal(first.names.length,1,'decorative figures cannot acquire catalog hit identity');
  assert.equal(pickSkyCatalogName(first.names,placed.x,placed.y),null);
  assert(first.commit());
  const next=frame(owner,16);next.catalog(name(180,400),metrics);
  assert.equal(next.constellation('Cep',caption,glyphs)?.y,178,'cleared centre must not make the accepted neighbour oscillate');
  assert(catalog.bounds.top+catalog.bounds.height<250);
});

test("a late constellation name reveals on the shared successful-copy clock and respects full foreground bounds",()=>{
  const owner=createSkyNameLayouts(),caption={text:'猎户座',x:200,y:300,opacity:.4,textAlign:'center' as const,letterSpacing:1};
  const glyphs={width:38,left:0,right:38,ascent:9,descent:9};
  const first=frame(owner,1000,false),enter=first.constellation('Ori',caption,glyphs)!;
  assert.equal(enter.opacity,0);assert(first.animating);assert(first.commit(2000));
  const next=frame(owner,2080,false);assert.equal(next.constellation('Ori',caption,glyphs)?.opacity,.2);
  assert(next.commit());
  const blocked=frame(owner,2160,false);
  assert.equal(blocked.constellation('Ori',caption,glyphs,()=>false),null);
  assert(blocked.commit());
  const returnFrame=frame(owner,2200,false);assert.equal(returnFrame.constellation('Ori',caption,glyphs)?.opacity,0);
  owner.reset();assert.equal(returnFrame.commit(),false);
});

const guide={targetId:'target:milky-way',displayName:'银河中心方向',direction:'西南',type:'MILKY_WAY'} as ResolvedSkyReport['targets'][number];
test('complete two-line guides center above their direction anchor and keep their own current action',()=>{
  const owner=createSkyNameLayouts(),job=frame(owner,0),projection={x:280,y:300,altitude:35.4};
  const label=job.target(guide,projection,.8,metrics,{...metrics,width:60,right:60})!;
  assert(label);assert.equal(label.action.kind,'target');assert.equal(label.captions[0]!.text,guide.displayName);
  assert.equal(label.captions[1]!.text,'西南 · 35°');
  for(const caption of label.captions){assert.equal(caption.x,projection.x);assert(caption.y<projection.y);assert.equal(caption.textAlign,'center');}
  assert(label.bounds!.width>=metrics.left+metrics.right);
  assert.equal(pickSkyControlName(job.controls,280,300)?.action,label.action);assert.equal(pickSkyCatalogName(job.names,280,300),null);
  assert.equal(job.catalog(name(280,280),metrics),null,'a lower-priority name cannot collide with the complete guide');assert(job.commit());
  const later=frame(owner,16),kept=later.target(guide,{...projection,x:170},.8,metrics,metrics)!;
  assert.equal(kept.captions[0]!.x,170);assert(kept.captions[0]!.y<projection.y);
  assert.equal(frame(owner,32).target(guide,projection,.8,metrics,metrics,()=>false),null);
});

test('selected names preserve honest location notices above the object and keep the separate reticle action',()=>{
  const owner=createSkyNameLayouts(),job=frame(owner,0),object={reference:'M:31',displayName:'仙女座星系',kind:'GALAXY' as const};
  const marker={x:180,y:250,radiusPx:12,nameOpacity:.5};
  const label=job.selected(object,marker,'地平线以下',metrics)!;
  assert.equal(label.captions[0]!.text,'仙女座星系 · 地平线以下');assert(label.captions[0]!.y<marker.y);
  assert.equal(label.captions[0]!.x,marker.x);assert(label.bounds!.height>=44);
  assert.equal(pickSkyControlName(job.controls,180,label.captions[0]!.y)?.action,label.action);assert(job.commit());
  const nearTop=frame(owner,16),withdrawn=nearTop.selected(object,{...marker,y:110},'地平线以下',metrics)!;
  assert.equal(withdrawn.captions.length,0,'do not move the name below to force it into the viewport');assert(withdrawn.anchorBounds);
  const wide=frame(owner,32),faded=wide.selected(object,{...marker,y:300,nameOpacity:0},null,metrics)!;
  assert.equal(faded.captions.length,0);assert.equal(pickSkyControlName(wide.controls,180,300)?.action,faded.action);
  const long=frame(owner,48),tooWide=long.selected(object,{...marker,y:300},'模拟地景遮挡',{...metrics,width:2000,right:2000})!;
  assert.equal(tooWide.bounds,null);assert.equal(tooWide.captions.length,0);assert(tooWide.anchorBounds);
});

test('control names start only on successful copy and excluded selected completions cannot reuse readiness',()=>{
  const owner=createSkyNameLayouts(),first=frame(owner,1000,false),projection={x:180,y:300,altitude:35};
  const enter=first.target(guide,projection,.4,metrics,metrics)!;
  assert.equal(enter.opacity,0);assert.equal(pickSkyControlName(first.controls,enter.bounds!.left+10,300),null);
  assert(first.commit(2000));
  const half=frame(owner,2080,false),label=half.target(guide,projection,.4,metrics,metrics)!;
  assert.equal(label.opacity,.2);assert(half.commit());
  const object={reference:'HR:8162',displayName:'Alderamin',kind:'STAR' as const};
  const discarded=frame(owner,2100,false),selection=discarded.selected(object,{x:180,y:400,radiusPx:12,nameOpacity:.4},null,metrics)!;
  assert(discarded.commit(3000,[selection.key]));
  const back=frame(owner,4000,false);
  assert.equal(back.selected(object,{x:180,y:400,radiusPx:12,nameOpacity:.4},null,metrics)!.opacity,0);
});

test('replacement intent with the same printed name cannot retain the previous action receipt',()=>{
  const owner=createSkyNameLayouts(),job=frame(owner,0),object={reference:'M:31',displayName:'仙女座星系',kind:'GALAXY' as const};
  const marker={x:180,y:300,radiusPx:12,nameOpacity:.5};
  const old=job.selected(object,marker,null,metrics)!;assert(job.commit());
  const next=frame(owner,16),fresh=next.selected({...object},marker,null,metrics)!;
  assert.equal(old.captions[0]!.text,fresh.captions[0]!.text);assert.deepEqual(old.bounds,fresh.bounds);
  assert(!sameSkyControlNames([old],[fresh]),'React must publish the new current action even when its pixels match');
});

test('qualified names fade out over fixed time at current coordinates and stop exposing the old text hit',()=>{
  const owner=createSkyNameLayouts(),start=frame(owner,0,false);start.catalog(name(180),metrics);assert(start.commit());
  const settled=frame(owner,160,false);assert.equal(settled.catalog(name(180),metrics)!.auxiliaryOpacity,.5);assert(settled.commit());
  const exit=frame(owner,200,false),first=exit.catalog(name(200,260,0),metrics)!;
  assert.equal(first.auxiliaryOpacity,.5);assert(first.retiring);assert.equal(first.caption.x,200);assert.equal(first.caption.y,236);
  assert.equal(pickSkyCatalogName(exit.names,first.bounds.left+10,first.bounds.top+10),null);assert(exit.animating);assert(exit.commit());
  const half=frame(owner,280,false),mid=half.catalog(name(220,270,0),metrics)!;
  assert.equal(mid.auxiliaryOpacity,.25);assert.equal(mid.caption.x,220);assert.equal(mid.caption.y,246);assert(half.commit());
  const end=frame(owner,360,false);assert.equal(end.catalog(name(240,280,0),metrics)!.auxiliaryOpacity,0);assert(!end.animating);assert(end.commit());
  assert.equal(frame(owner,400,false).retainedCatalogReferences.size,0);
});

test('the edge band starts a visible fixed-time exit instead of spending its opacity in a spatial ramp',()=>{
  const owner=createSkyNameLayouts(),settled=frame(owner,1000);settled.catalog(name(180),metrics);assert(settled.commit());
  const exit=frame(owner,1100,false),first=exit.catalog(name(64),metrics)!;
  assert(first&&first.retiring);assert.equal(first.auxiliaryOpacity,.5,'crossing the existing band starts at the last accepted alpha');
  assert.equal(first.caption.x,64);assert.equal(pickSkyCatalogName(exit.names,first.bounds.left+10,first.bounds.top+10),null);assert(exit.commit());
  const half=frame(owner,1180,false),moving=half.catalog(name(62),metrics)!;
  assert.equal(moving.auxiliaryOpacity,.25);assert.equal(moving.caption.x,62);assert(half.commit());
  const reverse=frame(owner,1200,false);assert.equal(reverse.catalog(name(75),metrics)!.auxiliaryOpacity,.25);assert(reverse.commit());
  const restored=frame(owner,1360,false);assert.equal(restored.catalog(name(80),metrics)!.auxiliaryOpacity,.5);assert(restored.commit());
  const outside=frame(owner,1380,false);assert.equal(outside.catalog(name(40),metrics),null,'already unfit whole text is never clamped');
});

test('ordinary current-position candidates preserve an exit identity without the legacy point-alpha ramp',()=>{
  const view={width:360,height:700,view:{basis:createSkyViewBasis(0,135,0)!,verticalFovDeg:45,landscape:null}};
  const star={reference:'HR:8162',displayName:'Alderamin',kind:'STAR' as const,magnitude:2.45,x:180,y:680,opacity:1};
  const retained=new Set([star.reference]);
  const ordinary=projectSkyCatalogNames(undefined,undefined,view,[star],undefined,{top:0,bottom:0},true,retained);
  assert.equal(ordinary.length,1);assert.equal(ordinary[0]!.auxiliaryOpacity,0,'the existing point edge band starts the common exit');
  assert.equal(ordinary[0]!.y,680,'a retained identity is still projected in its current location');
  const legacy=projectSkyCatalogNames(undefined,undefined,view,[star],undefined,{top:0,bottom:0});
  assert(legacy[0]!.auxiliaryOpacity>0,'deferred legacy/red layout retains its existing spatial fade');
});

test('re-entry reverses the last accepted fade and a rejected exit cannot retire the visible identity',()=>{
  const owner=createSkyNameLayouts(),start=frame(owner,0);start.catalog(name(180),metrics);assert(start.commit());
  const exit=frame(owner,16,false);exit.catalog(name(180,250,0),metrics);assert(exit.commit());
  const half=frame(owner,96,false);assert.equal(half.catalog(name(190,250,0),metrics)!.auxiliaryOpacity,.25);assert(half.commit());
  const reverse=frame(owner,112,false);assert.equal(reverse.catalog(name(200),metrics)!.auxiliaryOpacity,.25);assert(reverse.commit());
  const restored=frame(owner,272,false);assert.equal(restored.catalog(name(210),metrics)!.auxiliaryOpacity,.5);assert(!restored.animating);assert(restored.commit());
  const discarded=frame(owner,300,false);discarded.catalog(name(210,250,0),metrics);
  const current=frame(owner,316,false);assert.equal(current.catalog(name(210),metrics)!.auxiliaryOpacity,.5);assert(current.commit());assert.equal(discarded.commit(),false);
  const changed=owner.prepare({context:{},mode:'NIGHT'},400,360,700,{top:80,bottom:70});
  assert.equal(changed.retainedCatalogReferences.size,0);assert.equal(changed.catalog(name(210,250,0),metrics),null);
});
