import {assertBodyImageManifest,type NeptuneBandsManifestData} from "@starward/miniapp-contracts";

export function assertNeptuneBandsManifest(value:unknown):asserts value is NeptuneBandsManifestData{
  assertBodyImageManifest("neptune",value);
}
