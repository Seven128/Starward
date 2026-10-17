import {SKY_BODY_IMAGE_PROFILES} from "@/services/sky-body-image-profile";
import {useSkyBodyImage,type SkyBodyImageInput} from "./use-sky-body-image";

/** Compatibility facade; all supported bands use the shared resource owner. */
export function useSkyOpalBands(profile:{body:'JUPITER'|'SATURN'|'URANUS'|'NEPTUNE'},...input:SkyBodyImageInput){
  const kind=profile.body.toLowerCase() as 'jupiter'|'saturn'|'uranus'|'neptune';
  return useSkyBodyImage(SKY_BODY_IMAGE_PROFILES[kind],...input);
}
