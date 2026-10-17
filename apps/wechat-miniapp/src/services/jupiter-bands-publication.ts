import {assertBodyImageManifest,type JupiterBandsManifestData} from "@starward/miniapp-contracts";

export function assertJupiterBandsManifest(value:unknown):asserts value is JupiterBandsManifestData{
  assertBodyImageManifest("jupiter",value);
}
