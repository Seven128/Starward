import {useMemo} from "react";
import {useSkyBodyImage,type SkyBodyImageInput} from "./use-sky-body-image";
import {SKY_BODY_IMAGE_PROFILES} from "@/services/sky-body-image-profile";
import type {SkyBodyImageBinding} from "./sky-body-image-completion";

/** Fixed Hook order, one shared implementation. Never invoke Hooks from a dynamic registry. */
export function useSkyBodyImages(...input:SkyBodyImageInput){
  const moon=useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.moon,...input);
  const mars=useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.mars,...input);
  const mercury=useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.mercury,...input);
  const jupiter=useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.jupiter,...input);
  const saturn=useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.saturn,...input);
  const uranus=useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.uranus,...input);
  const neptune=useSkyBodyImage(SKY_BODY_IMAGE_PROFILES.neptune,...input);
  const resources=useMemo(()=>[moon,mars,mercury,jupiter,saturn,uranus,neptune],[moon,mars,mercury,jupiter,saturn,uranus,neptune]);
  const bindings=useMemo(()=>resources.map(resource=>resource.binding).filter((binding):binding is SkyBodyImageBinding=>binding!==null),
    [moon.binding,mars.binding,mercury.binding,jupiter.binding,saturn.binding,uranus.binding,neptune.binding]);
  return {resources,bindings,images:resources.flatMap(resource=>resource.image?[resource.image]:[]),
    loading:resources.some(resource=>resource.loading),failedImage(image:object){for(const resource of resources)resource.failedImage(image);}};
}
