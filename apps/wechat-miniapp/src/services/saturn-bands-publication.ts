import {assertBodyImageManifest,type SaturnBandsManifestData} from "@starward/miniapp-contracts";

export function assertSaturnBandsManifest(value:unknown):asserts value is SaturnBandsManifestData{
  assertBodyImageManifest("saturn",value);
}
