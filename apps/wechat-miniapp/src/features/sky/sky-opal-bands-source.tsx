import type {BodyImagePublications} from "@starward/miniapp-contracts";
import {SKY_BODY_IMAGE_PROFILES} from "@/services/sky-body-image-profile";
import {SkyBodyImageDisclosure} from "./sky-body-image-source";
type Kind='jupiter'|'saturn'|'uranus'|'neptune';
/** Compatibility facade; historical meaning and URLs come from accepted metadata. */
export function SkyOpalBandsSource({body,publication}:{body:Kind;publication:BodyImagePublications[Kind]|undefined}){
  return publication?<SkyBodyImageDisclosure reference={SKY_BODY_IMAGE_PROFILES[body].reference} publication={publication}/>:null;
}
