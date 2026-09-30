import assert from "node:assert/strict";
import test from "node:test";
import { lonLat2PixNest, pix2VecNest, pixcoord2VecNest } from "healpix-ts";
import { createSkyViewBasis } from "./sky-view-projection";
import { prepareSkyHipsTile, projectSkyHipsTileMesh, skyHipsTilePath } from "./sky-hips-tile-mesh";

const dot=(a:readonly number[],b:readonly number[])=>a.reduce((s,n,i)=>s+n*b[i]!,0);
const norm=(a:readonly number[])=>a.map(n=>n/Math.hypot(...a));

test("JPEG and PNG image pixels follow the CDS NESTED cell packaging on every face", () => {
  // CDS/Aladin's published FITS mapping assigns each quadrant 2*column+row
  // with the FITS row reversed; JPEG/PNG reverse it back. Thus JPEG (x=1,y=5)
  // in an 8x8 image has nested child 19, not child 35. This expectation comes
  // from the source packaging, independently of prepareSkyHipsTile's axes.
  // https://gist.github.com/tboch/f68cd1bb1529d8ac12184b40e54ba692
  for (const order of [0,3,8]) for (let face=0;face<12;face++) {
    const parent=face*4**order+Math.floor((4**order-1)/3);
    const tile=prepareSkyHipsTile(order,parent,16)!;
    const actual=tile.directions[11*17+3]!; // (u,v)=(1.5/8,5.5/8)
    const expected=pix2VecNest(2**(order+3),parent*64+19);
    assert.ok(Math.hypot(...actual.map((n,i)=>n-expected[i]!))<1e-12,
      `source pixel axes are transposed: order ${order}, face ${face}`);
  }
});

test("real HiPS tile identities and source-image axes locate Sombrero without TAN assumptions", () => {
  const pixel=lonLat2PixNest(256,189.99763,-11.62305);
  assert.equal(pixel,401329);
  assert.equal(skyHipsTilePath(8,pixel,"jpeg"),"Norder8/Dir400000/Npix401329.jpg");
  assert.equal(skyHipsTilePath(8,pixel,"png"),"Norder8/Dir400000/Npix401329.png");
  assert.equal(skyHipsTilePath(0,pixel,"png"),null);
  const tile=prepareSkyHipsTile(8,pixel,16)!;
  const ra=189.99763*Math.PI/180,dec=-11.62305*Math.PI/180;
  const target=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
  let closest={separation:Infinity,u:0,v:0};
  for(let i=0;i<tile.directions.length;i++){
    const separation=Math.acos(Math.max(-1,Math.min(1,dot(target,tile.directions[i]!))));
    if(separation<closest.separation)closest={separation,u:(i%17)/16,v:Math.floor(i/17)/16};
  }
  // Source JPEG columns are nw; image rows are ne. The previous expectation
  // copied the opposite axis convention and did not establish registration.
  assert.ok(Math.abs(closest.u-.88)<.04);
  assert.ok(Math.abs(closest.v-.76)<.04);
  assert.ok(closest.separation<.001);
});

test("HEALPix triangles use the shared report rotation and stereographic sky camera", () => {
  const tile=prepareSkyHipsTile(8,401329)!;
  const center=pixcoord2VecNest(256,401329,.5,.5);
  const [cx,cy,cz]=center;
  const east=norm([-cy,cx,0]);
  const north=[cy*east[2]!-cz*east[1]!,cz*east[0]!-cx*east[2]!,cx*east[1]!-cy*east[0]!];
  const matrix=[...east,...north,...center] as [number,number,number,number,number,number,number,number,number];
  const view={basis:createSkyViewBasis(0,180,0)!,verticalFovDeg:2};
  const triangles=projectSkyHipsTileMesh(tile,matrix,view,427,920)!;
  assert.ok(triangles.length>0 && triangles.length%12===0);
  for(let i=0;i<triangles.length;i+=4){
    assert.ok(Number.isFinite(triangles[i]) && Number.isFinite(triangles[i+1]));
    assert.ok(triangles[i+2]!>=0 && triangles[i+2]!<=1);
    assert.ok(triangles[i+3]!>=0 && triangles[i+3]!<=1);
  }
  const mirrored=[...matrix] as typeof matrix;
  mirrored[0]=-mirrored[0];mirrored[1]=-mirrored[1];mirrored[2]=-mirrored[2];
  assert.equal(projectSkyHipsTileMesh(tile,mirrored,view,427,920),null);
});

test("one HiPS mesh reuses its fixed camera regardless of source tessellation", () => {
  const matrix = [1,0,0,0,1,0,0,0,1] as const;
  const reads = (divisions: number) => {
    let basisReads = 0;
    const actual = createSkyViewBasis(0,180,0)!;
    const basis = new Proxy(actual, { get(owner, key, receiver) {
      if (key === "right" || key === "up" || key === "forward") basisReads++;
      return Reflect.get(owner, key, receiver);
    } });
    const result = projectSkyHipsTileMesh(prepareSkyHipsTile(0,0,divisions)!, matrix,
      { basis, verticalFovDeg: 267.8 }, 390.4, 844);
    assert(result && result.length > 0, "the bounded work check must project real triangles");
    return basisReads;
  };
  // Every vertex still uses its own real direction. Increasing source detail
  // must not repeat validation/scaling of the unchanged view for each vertex.
  assert.equal(reads(16), reads(2));
});
