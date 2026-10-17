import {assertBodyImageManifest,type MarsTextureManifestData} from "@starward/miniapp-contracts";

export function assertMarsTextureManifest(value:unknown):asserts value is MarsTextureManifestData{
  assertBodyImageManifest("mars",value);
}
