import {assertBodyImageManifest,type UranusBandsManifestData} from "@starward/miniapp-contracts";

export function assertUranusBandsManifest(value:unknown):asserts value is UranusBandsManifestData{
  assertBodyImageManifest("uranus",value);
}
