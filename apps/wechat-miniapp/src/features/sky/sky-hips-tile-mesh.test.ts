import assert from "node:assert/strict";
import test from "node:test";
import { lonLat2PixNest, pix2VecNest, pixcoord2VecNest, vec2PixNest } from "healpix-ts";
import { createSkyViewBasis, unprojectSkyPoint } from "./sky-view-projection";
import { prepareSkyHipsTile, projectSkyHipsTileMesh, skyHipsTilePath,
  skyHipsRenderTileGeometry,skyHipsTileIntersectsView } from "./sky-hips-tile-mesh";

const dot=(a:readonly number[],b:readonly number[])=>a.reduce((s,n,i)=>s+n*b[i]!,0);
const norm=(a:readonly number[])=>a.map(n=>n/Math.hypot(...a));
function weightsAt(mesh:readonly number[],i:number,x:number,y:number):readonly [number,number,number]|null{
  const ax=mesh[i]!,ay=mesh[i+1]!,bx=mesh[i+4]!,by=mesh[i+5]!,cx=mesh[i+8]!,cy=mesh[i+9]!;
  const denominator=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
  if(Math.abs(denominator)<1e-9)return null;
  const a=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/denominator;
  const b=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/denominator;
  const c=1-a-b;
  return Math.min(a,b,c)>=-1e-10?[a,b,c]:null;
}

test("an opposite base face cannot paint through the stereographic antipode",()=>{
  const matrix=[1,0,0,0,1,0,0,0,1] as const;
  const current={basis:createSkyViewBasis(22,45,0)!,verticalFovDeg:45};
  assert.equal(vec2PixNest(1,[...current.basis.forward]),8,"the real center ray belongs to base face 8");
  const covers:number[]=[];
  for(let pixel=0;pixel<12;pixel++){
    const mesh=projectSkyHipsTileMesh(skyHipsRenderTileGeometry(0,pixel)!,matrix,current,390,844)!;
    if(mesh.some((_value,i)=>i%12===0&&weightsAt(mesh,i,195,422)))covers.push(pixel);
  }
  assert.deepEqual(covers,[8],"the previously submitted opposite face 2 must not sample the center");
});

test("full-sphere local and 270-degree views keep the actual center face and original source coordinates",()=>{
  const matrix=[1,0,0,0,1,0,0,0,1] as const;
  for(const altitude of [-89,-45,0,45,89])for(const azimuth of [0,22,90,177,270])for(const fov of [45,85,270]){
    const current={basis:createSkyViewBasis(azimuth,90+altitude,0)!,verticalFovDeg:fov};
    const expected=vec2PixNest(1,[...current.basis.forward]);
    let actualCenter=false,paintedCenter=false;
    for(let pixel=0;pixel<12;pixel++){
      const mesh=projectSkyHipsTileMesh(skyHipsRenderTileGeometry(0,pixel)!,matrix,current,390,844)!;
      for(let i=0;i<mesh.length;i+=12){
        const weights=weightsAt(mesh,i,195,422);if(!weights)continue;
        paintedCenter=true;
        actualCenter ||= pixel===expected;
        const u=weights.reduce((sum,w,j)=>sum+w*mesh[i+j*4+2]!,0);
        const v=weights.reduce((sum,w,j)=>sum+w*mesh[i+j*4+3]!,0);
        assert.ok(u>=-1e-9&&u<=1+1e-9&&v>=-1e-9&&v<=1+1e-9);
        // Image u is nw and v is ne; healpix-ts accepts (ne,nw).
        // The independent source-packaging test below verifies that mapping.
        const source=pixcoord2VecNest(1,pixel,v,u);
        const vertices=[0,4,8].map(offset=>pixcoord2VecNest(1,pixel,mesh[i+offset+3]!,mesh[i+offset+2]!));
        const span=Math.acos(Math.max(-1,Math.min(1,Math.min(dot(vertices[0]!,vertices[1]!),
          dot(vertices[1]!,vertices[2]!),dot(vertices[2]!,vertices[0]!)))));
        const separation=Math.acos(Math.max(-1,Math.min(1,dot(source,current.basis.forward))));
        assert.ok(separation<=span+1e-6,`${altitude}/${azimuth}/${fov}: face ${pixel} samples another sky region`);
      }
    }
    assert.ok(paintedCenter,`${altitude}/${azimuth}/${fov}: the true center ray must still paint`);
    // Exact meridians lie on shared face edges. The installed lookup's edge
    // tie-break can return a remote face at (longitude=180, latitude=45), so
    // these cases use the independent source-coordinate check above instead.
    if(Math.abs(current.basis.forward[0])>1e-12&&Math.abs(current.basis.forward[1])>1e-12)
      assert.ok(actualCenter,`${altitude}/${azimuth}/${fov}: the true face ${expected} must still paint`);
  }
});

test("base-face request footprints reuse actual render geometry and preserve unknown demand",()=>{
  const matrix=[1,0,0,0,1,0,0,0,1] as const;
  const view={basis:createSkyViewBasis(0,180,0)!,verticalFovDeg:85};
  let visible=0,empty=0;
  for(let pixel=0;pixel<12;pixel++){
    const geometry=skyHipsRenderTileGeometry(0,pixel)!;
    assert.equal(geometry,skyHipsRenderTileGeometry(0,pixel));
    assert.equal(geometry.divisions,16);
    const mesh=projectSkyHipsTileMesh(geometry,matrix,view,390,844)!;
    assert.equal(skyHipsTileIntersectsView(0,pixel,matrix,view,390,844),mesh.length>0);
    if(mesh.length)visible++;else empty++;
  }
  assert(visible>0&&empty>0,"the request gate must distinguish actual submitted and empty faces");
  assert.equal(skyHipsTileIntersectsView(0,0,matrix,view,NaN,844),true);
  assert.equal(skyHipsTileIntersectsView(0,12,matrix,view,390,844),true);
  assert.equal(skyHipsTileIntersectsView(0,0,[-1,0,0,0,1,0,0,0,1],view,390,844),true);
});

test("a complete below-horizon HiPS tile remains both requested and projected",()=>{
  const matrix=[1,0,0,0,1,0,0,0,1] as const;
  const pixel=lonLat2PixNest(256,90,-30);
  const tile=skyHipsRenderTileGeometry(8,pixel)!;
  assert.ok(tile.directions.every(direction=>direction[2]<0),"the actual tile must be entirely below the geometric horizon");
  const current={basis:createSkyViewBasis(0,60,0)!,verticalFovDeg:2};
  const mesh=projectSkyHipsTileMesh(tile,matrix,current,390,844)!;
  assert.ok(mesh.length>0&&mesh.length%12===0,"original source UV triangles must reach the painter");
  assert.equal(skyHipsTileIntersectsView(8,pixel,matrix,current,390,844),true);
  assert.equal(skyHipsTileIntersectsView(8,pixel,matrix,{...current,basis:createSkyViewBasis(90,60,0)!},390,844),false,
    "a certified offscreen tile still retires demand");
});

test("a horizon-crossing HiPS face submits both sides of the same source mesh",()=>{
  const matrix=[1,0,0,0,1,0,0,0,1] as const;
  const tile=skyHipsRenderTileGeometry(0,5)!;
  assert.ok(tile.directions.some(ray=>ray[2]<0)&&tile.directions.some(ray=>ray[2]>0));
  const current={basis:createSkyViewBasis(0,90,0)!,verticalFovDeg:85};
  const mesh=projectSkyHipsTileMesh(tile,matrix,current,390,844)!;
  let below=false,above=false;
  for(let i=0;i<mesh.length;i+=12){
    const z=[0,4,8].map(offset=>unprojectSkyPoint(mesh[i+offset]!,mesh[i+offset+1]!,
      current.basis,390,844,85)![2]);
    below ||= z.every(up=>up < -1e-9);above ||= z.every(up=>up > 1e-9);
  }
  assert.ok(below&&above,"fully underground and above-ground cells must both reach the original texture sampler");
  assert.equal(skyHipsTileIntersectsView(0,5,matrix,current,390,844),true);
});

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
