import {assertBodyImageManifest,type BodyImagePublications} from "@starward/miniapp-contracts";
type Bands=Pick<BodyImagePublications,'jupiter'|'saturn'|'uranus'|'neptune'>;
/** Compatibility facade; admission is owned by the shared reviewed declarations. */
export function assertOpalBandsManifest<T extends Bands[keyof Bands]>(value:unknown,expected:{body:keyof Bands}):asserts value is T{
  assertBodyImageManifest(expected.body,value);
}
