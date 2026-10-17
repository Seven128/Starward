import {SKY_BODY_IMAGE_PROFILES} from "@/services/sky-body-image-profile";
import {useSkyBodyImage,type SkyBodyImageInput} from "./use-sky-body-image";

export function useSkyMercuryTexture(...input:SkyBodyImageInput){
  return useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.mercury,...input);
}
