import assert from "node:assert/strict";
import test from "node:test";
import {registerSkyArtwork} from "./sky-artwork-registration";
import {validSkyArtworkLevel, type SkyArtworkLevel} from "./sky-artwork-level-composition";

test("the explicit coverage contract rejects display alpha and malformed independent fields", () => {
  const direction=(x:number,y:number) => {const norm=Math.hypot(x,y,1);return [x/norm,y/norm,1/norm] as const;};
  const registration=registerSkyArtwork([
    {uv:[0,0],direction:direction(-1,-1)}, {uv:[1,0],direction:direction(1,-1)},
    {uv:[0,1],direction:direction(-1,1)},
  ])!;
  const valid:SkyArtworkLevel={image:{width:512,height:512},registration,sampleAvailability:"joint-area-alpha"};
  assert(validSkyArtworkLevel(valid));
  for(const sampleAvailability of [undefined,"display-contribution","opaque-jpeg"])
    assert(!validSkyArtworkLevel({...valid,sampleAvailability} as unknown as SkyArtworkLevel));
  for(const rows of [undefined,[],[[1,2,3]],[[1,2],[1,2,3],[1,2,3]]])
    assert(!validSkyArtworkLevel({...valid,registration:{...registration,rows}} as unknown as SkyArtworkLevel));
  assert(!validSkyArtworkLevel({...valid,image:{width:0,height:512}}));
  assert(!validSkyArtworkLevel({...valid,registration:{...registration,determinant:NaN}}));
  const prepared: SkyArtworkLevel = { image: valid.image, registration,
    geometricCoverage: "geometric-source-area", scientificAvailability: "UNKNOWN" };
  assert(validSkyArtworkLevel(prepared));
  assert(!("sampleAvailability" in prepared), "geometric support is not a scientific mask");
  for (const patch of [{ scientificAvailability: undefined }, { scientificAvailability: "VALID" },
    { geometricCoverage: "joint-area-alpha" }, { sampleAvailability: "joint-area-alpha" },
    { sampleAvailability: undefined }])
    assert(!validSkyArtworkLevel({ ...prepared, ...patch } as unknown as SkyArtworkLevel));
  assert(!validSkyArtworkLevel({ ...valid, geometricCoverage: "geometric-source-area",
    scientificAvailability: "UNKNOWN" } as unknown as SkyArtworkLevel));
});
