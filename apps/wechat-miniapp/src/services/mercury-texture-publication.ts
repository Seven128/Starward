import {assertBodyImageManifest,type MercuryTextureManifestData} from "@starward/miniapp-contracts";

export function assertMercuryTextureManifest(value:unknown):asserts value is MercuryTextureManifestData{
  assertBodyImageManifest("mercury",value);
}
