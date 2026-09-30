import assert from "node:assert/strict";
import test from "node:test";
import { OBSERVATION_FRAME_FORMAT, type SkyObservationFrame, type SkyReport } from "@starward/miniapp-contracts";
import { exactSkyObservationFrame } from "./sky-observation-frame";

const at="2026-09-23T00:00:00.000Z";
const frame:SkyObservationFrame={format:OBSERVATION_FRAME_FORMAT,at,
  observer:{latitude:22.54,longitude:113.95,elevationM:50},
  equatorialToEnu:[1,0,0,0,1,0,0,0,1]};
const report={hourly:[{at}],observationFrames:[frame],
  skyScene:{state:"UNAVAILABLE",frames:[{at,state:"UNAVAILABLE",geometry:null}]}} as unknown as SkyReport;

test("catalog outage preserves exact independent image frame while stale or mirrored frames are rejected",()=>{
  assert.equal(exactSkyObservationFrame(report,at),frame);
  assert.equal(exactSkyObservationFrame(report,"2026-09-23T01:00:00.000Z"),null);
  assert.equal(exactSkyObservationFrame({hourly:report.hourly},at),null);
  assert.equal(exactSkyObservationFrame({...report,observationFrames:[{...frame,at:"2026-09-22T00:00:00.000Z"}]},at),null);
  assert.equal(exactSkyObservationFrame({...report,observationFrames:[{...frame,equatorialToEnu:[-1,0,0,0,1,0,0,0,1]}]},at),null);
});
