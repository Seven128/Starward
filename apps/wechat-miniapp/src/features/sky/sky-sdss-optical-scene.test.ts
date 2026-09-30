import assert from "node:assert/strict";
import test from "node:test";
import { drawSkyScene, type SkyScenePaintedSources } from "./sky-scene-render";
import { sdssOpticalLevelForFov, sdssOpticalPresentation } from "./sky-sdss-optical-selection";
import { createSkyViewBasis, type SkyViewBasis } from "./sky-view-projection";
import { createSkyPanoramaMask } from "./sky-landscape-mask";

const at = "2026-09-25T00:00:00.000Z";
const basis = createSkyViewBasis(0, 130, 0)!;
const point = [0, 0, 40, 0, 40.1, 359.9, 40];
const report = { hourly: [{ at }], skyScene: { state: "UNAVAILABLE", frames: [],
  deepSky: { state: "AVAILABLE", catalog: { imageRegistration: "ICRS_TAN_NORTH_0_1_V1",
    entries: [{ objectRef: "M:51" }] }, frames: [{ at, state: "AVAILABLE", points: [point] }] } },
  targetFrames: [] };

test("optical registration uses the admitted target, without painting another galaxy's position", () => {
  const targetPoint = [1, 100, 40, 100, 40.1, 99.9, 40];
  const data = { ...report, skyScene: { ...report.skyScene, deepSky: { ...report.skyScene.deepSky,
    catalog: { imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: "M:51" }, { objectRef: "M:82" }] },
    frames: [{ at, state: "AVAILABLE", points: [point, targetPoint] }] } } };
  const image = { kind: "M82 optical" };
  const submissions: Array<{kind?:string}> = []; let painted: object | null = null;
  const surface = new Proxy({}, { get: (_target, key) => key === "artwork"
    ? (submitted: {kind?:string}) => { submissions.push(submitted); return true; } : () => undefined });
  const optical = { image, reference: "M:82", publicationHash: "admitted-M82", fieldDegrees: .3, level: "OVERVIEW" };
  draw(surface, "NIGHT", optical, undefined, at, (_snapshot, sources) => { painted = sources.sdssOpticalImage; },
    createSkyViewBasis(100, 130, 0)!, { data });
  assert.deepEqual(submissions, [image], "M82 must paint in its own nonempty target viewport");
  assert.strictEqual(painted, image);
  submissions.length = 0;
  draw(surface, "NIGHT", optical, undefined, at, (_snapshot, sources) => { painted = sources.sdssOpticalImage; },
    basis, { data });
  assert.deepEqual(submissions.map(submitted => submitted.kind), ["W3"], "only the independent M51 infrared patch is eligible in M51's viewport");
  assert.equal(painted, null, "the M82 image must not be attributed to M51");
});

function draw(surface: object, mode: "NIGHT" | "OBSERVATION", optical: object | null,
  failed?: (image: object) => void, frameAt = at,
  painted?: (_snapshot: unknown, sources: { sdssOpticalImage: object | null; deepSkyImage: object | null }) => void,
  camera: SkyViewBasis = basis,
  scene?: { data: object; fov?: number; landscape?: { enabled: boolean; panorama?: object } }) {
  const args: unknown[] = Array(35).fill(undefined);
  args[0] = surface; args[1] = scene?.data ?? report; args[2] = frameAt; args[3] = null; args[4] = null;
  args[5] = 390; args[6] = 844; args[7] = mode; args[8] = painted; args[10] = scene?.fov ?? 0.05;
  args[11] = { reference: "M:51", level: "DETAIL", fieldDegrees: 0.25, image: { kind: "W3" } };
  // Existing cases describe the legacy M51 fixture; new cases supply their own identity.
  args[12] = camera; args[14] = failed; args[30] = optical ? {
    reference: "M:51", publicationHash: "legacy-M51", ...optical } : null; args[31] = failed;
  args[34] = scene?.landscape;
  (drawSkyScene as (...values: unknown[]) => void)(...args);
}

test("M51 optical level follows measured field while wider views keep W3", () => {
  assert.equal(sdssOpticalLevelForFov(15), null);
  assert.equal(sdssOpticalLevelForFov(0.3), "OVERVIEW");
  assert.equal(sdssOpticalLevelForFov(0.1), "MEDIUM");
  assert.equal(sdssOpticalLevelForFov(0.05), "DETAIL");
  assert.equal(sdssOpticalLevelForFov(Number.NaN), null);
});

test("fully covered M51 images lose visible credits only after the foreground actually paints", () => {
  // Public example point's real M51 registration at 2026-09-28T22:30Z.
  // The synthetic report light merely enables the original virtual foreground.
  const coveredPoint = [0,42.09119465,7.958629734,41.999449434,8.000403185,42.048927669,7.867814753];
  const data = { ...report, hourly: [{ at, sunAzimuthDeg: 270, sunAltitudeDeg: -6 }],
    skyScene: { ...report.skyScene, deepSky: { ...report.skyScene.deepSky,
      frames: [{ at, state: "AVAILABLE", points: [coveredPoint] }] } } };
  const camera = createSkyViewBasis(coveredPoint[1]!,90+coveredPoint[2]!,0)!;
  const optical = { image: { kind: "SDSS" }, fieldDegrees: 512*.4/3600, level: "DETAIL" };
  for (const [enabled,available] of [[true,true],[false,true],[true,false]] as const) {
    let submissions=0,failures=0;
    const captured: { sources: SkyScenePaintedSources | null } = { sources: null };
    const surface = new Proxy({}, { get: (_target,key) => key === "artwork"
      ? () => { submissions++; return true; } : key === "landscape" ? () => available : () => true });
    draw(surface,"NIGHT",optical,()=>{failures++;},at,(_snapshot,sources)=>{captured.sources=sources;},
      camera,{data,landscape:{enabled}});
    assert.equal(submissions,1,"a successful optical cutout chooses one spectrum even if the later foreground fails");
    assert.equal(failures,0,"normal occlusion cannot poison downloads or force retries");
    if(enabled&&available) assert.deepEqual(captured.sources,{sdssOpticalImage:null,deepSkyImage:null},
      "a canvas entirely covered by the model has no visible optical or infrared image");
    else { assert.strictEqual(captured.sources!.sdssOpticalImage,optical.image);
      assert.equal(captured.sources!.deepSkyImage,null,"the chosen optical cutout does not also paint infrared"); }
    draw(surface,"NIGHT",null,()=>{failures++;},at,(_snapshot,sources)=>{captured.sources=sources;},
      camera,{data,landscape:{enabled}});
    assert.equal(Boolean(captured.sources!.deepSkyImage),!(enabled&&available),
      "W3 is still independently usable without optical pixels, unless the actual foreground covers it");
  }
});

test("leaving the image's whole field clears both credits without reporting a load failure", () => {
  let submissions = 0, failures = 0;
  const captured: { painted: SkyScenePaintedSources | null } = { painted: null };
  const surface = new Proxy({}, { get: (_target, key) => key === "artwork"
    ? () => { submissions++; return true; } : () => undefined });
  const optical = { image: { kind: "SDSS" }, fieldDegrees: .3, level: "OVERVIEW" };
  const record = (_snapshot: unknown, sources: SkyScenePaintedSources) => { captured.painted = sources; };
  draw(surface, "NIGHT", optical, () => { failures++; }, at, record, createSkyViewBasis(180, 130, 0)!);
  assert.equal(submissions, 0, "offscreen draws cannot be confused with visible pixels");
  assert.deepEqual(captured.painted, { sdssOpticalImage: null, deepSkyImage: null });
  assert.equal(failures, 0, "normal camera movement must not poison the retry state");
  draw(surface, "NIGHT", optical, () => { failures++; }, at, record);
  assert.equal(submissions, 1, "returning to the cached optical image resumes its chosen spectrum");
  assert.strictEqual(captured.painted!.sdssOpticalImage, optical.image);
  assert.equal(captured.painted!.deepSkyImage,null,"successful optical chooses one spectrum throughout this viewport");
});

test("foreground coverage preserves exposed image edges, including a covered center",()=>{
  const edgePoint=[0,332.46,10,332.46,10.1,332.36,10];
  const data={...report,hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:-24}],
    skyScene:{...report.skyScene,deepSky:{...report.skyScene.deepSky,
      frames:[{at,state:"AVAILABLE",points:[edgePoint]}]}}};
  const optical={image:{kind:"SDSS"},fieldDegrees:512*.4/3600,level:"DETAIL"};
  const captured:{sources:SkyScenePaintedSources|null}={sources:null};
  const surface=new Proxy({}, {get:()=>()=>true});
  draw(surface,"NIGHT",optical,undefined,at,(_snapshot,sources)=>{captured.sources=sources;},
    createSkyViewBasis(332.46,100,0)!,{data,fov:.3,landscape:{enabled:true}});
  assert.strictEqual(captured.sources!.sdssOpticalImage,optical.image,"the visible optical edge still needs its own credit");
  assert.equal(captured.sources!.deepSkyImage,null,"optical field edges blend with the sky, without fabricating an infrared/optical composite");
});

test("a fully covered narrow viewport loses credit even when image edges extend into open sky offscreen",()=>{
  const edgePoint=[0,329.1,10,329.1,10.1,329,10];
  const data={...report,hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:-24}],
    skyScene:{...report.skyScene,deepSky:{...report.skyScene.deepSky,
      frames:[{at,state:"AVAILABLE",points:[edgePoint]}]}}};
  const captured:{sources:SkyScenePaintedSources|null}={sources:null};
  draw(new Proxy({}, {get:()=>()=>true}),"NIGHT",null,undefined,at,
    (_snapshot,sources)=>{captured.sources=sources;},createSkyViewBasis(329.1,100,0)!,
    {data,landscape:{enabled:true}});
  assert.equal(captured.sources!.deepSkyImage,null,"offscreen exposed image edges cannot establish visible pixels");
});

test("rejected optical falls back to independent W3 while preserving the scene", () => {
  const drawings: string[] = [];
  let failed: object | null = null, finished = 0;
  let paintedImage: object | null = null;
  const sdss = { image: { kind: "SDSS" }, fieldDegrees: 512 * 0.4 / 3600, level: "DETAIL" };
  const surface = new Proxy({}, { get: (_target, key) => key === "artwork"
    ? (image: { kind: string }) => { drawings.push(image.kind); return image.kind !== "SDSS"; }
    : key === "finish" ? () => { finished++; } : () => undefined });
  draw(surface, "NIGHT", sdss, image => { failed = image; }, at,
    (_snapshot, sources) => { paintedImage = sources.sdssOpticalImage; });
  assert.deepEqual(drawings, ["SDSS", "W3"]);
  assert.strictEqual(failed, sdss.image);
  assert.equal(paintedImage, null, "a rejected GPU image is not credited as painted");
  assert.equal(finished, 1);
  drawings.length = 0;
  draw(surface, "NIGHT", null);
  assert.deepEqual(drawings, ["W3"], "failed optical patch cannot erase independent W3 pixels");
  drawings.length = 0;
  draw(surface, "OBSERVATION", sdss);
  draw(surface, "NIGHT", sdss, undefined, "2026-09-25T01:00:00.000Z");
  assert.deepEqual(drawings, [], "red mode and a stale time cannot display either historical image");
});

test("one object's painted optical pixels do not combine with its independent infrared spectrum", () => {
  const modes: unknown[][] = [];
  const surface = new Proxy({}, { get: (_target, key) => key === "artwork"
    ? (image: { kind: string }, _registration: unknown, _view: unknown, opacity: number,
      _tint: string, composite?: string) => { modes.push([image.kind, opacity, composite]); return true; }
    : () => undefined });
  draw(surface, "NIGHT", { image: { kind: "SDSS" }, fieldDegrees: .3, level: "OVERVIEW" });
  assert.deepEqual(modes, [["SDSS", 1, "optical-cutout"]]);
});

test("refinement draws its registered wider optical field first and keeps independent recovery and credits",()=>{
  const fine={kind:"fine"},coarse={kind:"coarse"};
  const optical={image:fine,fieldDegrees:.0568888889,level:"DETAIL",coarser:{image:coarse,fieldDegrees:.1137777778,level:"MEDIUM"}};
  const failureSets:object[][]=[[],[fine],[coarse],[fine,coarse]];
  for(const rejected of failureSets){
    const submitted:Array<{image:object;composite:string}>=[],failures:object[]=[];
    let sources:SkyScenePaintedSources|null=null;
    const surface=new Proxy({}, {get:(_target,key)=>key==="artwork"
      ? (image:object,_registration:unknown,_view:unknown,_opacity:number,_tint:string,composite:string)=>{
        submitted.push({image,composite});return !rejected.includes(image);}
      :()=>undefined});
    draw(surface,"NIGHT",optical,image=>failures.push(image),at,(_snapshot,value)=>{sources=value;});
    assert.strictEqual(submitted[0]!.image,coarse,"the wider field must support the fine field's actual exterior");
    assert.strictEqual(submitted[1]!.image,fine);
    assert.equal(submitted[0]!.composite,"optical-cutout");assert.equal(submitted[1]!.composite,"optical-cutout");
    assert.deepEqual(failures,rejected.length===2?[coarse,fine]:rejected,"failures belong to the actual failed native image");
    const painted=!rejected.includes(fine)?fine:!rejected.includes(coarse)?coarse:null;
    assert.strictEqual(sources!.sdssOpticalImage,painted,"credit follows the finest successful field, including coarse-only recovery");
    assert.equal(Boolean(sources!.deepSkyImage),!painted,"W3 is independent fallback only when both optical fields are unavailable");
    assert.equal(submitted.length,painted?2:3);
  }
});

test("foreground covering the fine field still credits the exposed wider optical field",()=>{
  // A flat opaque virtual foreground at +10 degrees, with real shared mask
  // sampling/cone bounds. No claim of measured landscape or actual target site.
  const width=4,height=8192,alpha=new Uint8Array(width*height);
  for(let y=0;y<height;y++)if(90-(y+.5)*180/height<=10)alpha.fill(255,y*width,(y+1)*width);
  const mask=createSkyPanoramaMask({projection:{seamAzimuthDeg:0}} as Parameters<typeof createSkyPanoramaMask>[0],
    {image:{width,height}} as Parameters<typeof createSkyPanoramaMask>[1],alpha);
  const lowPoint=[0,0,9.92,0,10.02,359.9,9.92];
  const data={...report,hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:-24}],skyScene:{...report.skyScene,deepSky:{...report.skyScene.deepSky,
    frames:[{at,state:"AVAILABLE",points:[lowPoint]}]}}};
  const fine={kind:"fine"},coarse={kind:"coarse"};let sources:SkyScenePaintedSources|null=null;
  const optical={image:fine,fieldDegrees:.0568888889,level:"DETAIL",coarser:{image:coarse,fieldDegrees:.2275555556,level:"OVERVIEW"}};
  draw(new Proxy({}, {get:()=>()=>true}),"NIGHT",optical,undefined,at,(_snapshot,value)=>{sources=value;},
    createSkyViewBasis(0,99.92,0)!,{data,fov:.3,landscape:{enabled:true,panorama:{image:{},mask}}});
  assert.strictEqual(sources!.sdssOpticalImage,coarse,"a covered finer field cannot erase the wider exposed field's provenance");
  assert.equal(sources!.deepSkyImage,null);
});

test("partial image edges remain eligible after their center leaves the narrow viewport", () => {
  const drawings: string[] = [];
  const surface = new Proxy({}, { get: (_target, key) => key === "artwork"
    ? (image: { kind: string }) => { drawings.push(image.kind); return true; } : () => undefined });
  // Vertical viewport covers 40.055..40.105 degrees: the image center is outside,
  // while both 0.25/0.3-degree fields cover the full viewport in altitude.
  draw(surface, "NIGHT", { image: { kind: "SDSS" }, fieldDegrees: .3, level: "OVERVIEW" },
    undefined, at, undefined, createSkyViewBasis(0, 130.08, 0)!);
  assert.deepEqual(drawings, ["SDSS"]);
});

test("SDSS credit follows committed optical pixels across request and focus transitions", () => {
  const first = { kind: "SDSS overview" }, second = { kind: "SDSS detail" };
  const surface = new Proxy({}, { get: (_target, key) => key === "artwork"
    ? () => true : () => undefined });
  let paintedImage: object | null = null;
  const record = (_snapshot: unknown, sources: { sdssOpticalImage: object | null }) => {
    paintedImage = sources.sdssOpticalImage;
  };
  draw(surface, "NIGHT", { image: first, fieldDegrees: 0.3, level: "OVERVIEW" }, undefined, at, record);
  assert.strictEqual(paintedImage, first);
  assert.equal(sdssOpticalPresentation({ requested: false, paintedImage, canvasVisible: true,
    failed: false, loading: false }), "CREDIT", "old pixels remain attributed after focus changes");
  assert.equal(sdssOpticalPresentation({ requested: true, paintedImage, canvasVisible: true,
    failed: false, loading: true }), "CREDIT", "loading a finer level does not remove prior credit");
  draw(surface, "NIGHT", { image: second, fieldDegrees: 0.1, level: "DETAIL" }, undefined, at, record);
  assert.strictEqual(paintedImage, second);
  draw(surface, "NIGHT", null, undefined, at, record);
  assert.equal(paintedImage, null);
  assert.equal(sdssOpticalPresentation({ requested: true, paintedImage, canvasVisible: true,
    failed: true, loading: false }), "RETRY");
  assert.equal(sdssOpticalPresentation({ requested: true, paintedImage: first, canvasVisible: false,
    failed: false, loading: true }), "LOADING", "hidden canvas pixels must not claim credit");
  draw(surface, "OBSERVATION", { image: second, fieldDegrees: 0.1, level: "DETAIL" }, undefined, at, record);
  assert.equal(paintedImage, null, "red mode never paints optical image");
});
